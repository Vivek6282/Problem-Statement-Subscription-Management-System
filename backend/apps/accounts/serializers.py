from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _
from .models import User, Role

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    customer_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'is_active', 'is_staff', 'date_joined',
            'full_name', 'customer_id'
        ]
        read_only_fields = ['id', 'date_joined', 'is_staff', 'customer_id']

    def get_customer_id(self, obj):
        profile = getattr(obj, 'customer_profile', None)
        return profile.id if profile else None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone', 'company_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": _("Passwords do not match.")})
        
        # Validate password complexity via custom and configured validators
        user_dummy = User(email=attrs.get('email', 'test@example.com'))
        validate_password(attrs['password'], user=user_dummy)
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        company_name = validated_data.pop('company_name', '')
        password = validated_data.pop('password')
        
        # Public registration always creates CUSTOMER role
        user = User.objects.create_user(
            role=Role.CUSTOMER,
            password=password,
            **validated_data
        )

        # Automatically create customer profile for self-service portal
        from apps.customers.models import Customer
        Customer.objects.create(
            user=user,
            name=user.full_name or user.email,
            email=user.email,
            phone=user.phone,
            company=company_name or ''
        )

        return user

class StaffCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'phone', 'role', 'is_active']
        read_only_fields = ['id']

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_role(self, value):
        if value not in [Role.ADMIN, Role.STAFF]:
            raise serializers.ValidationError(_("Can only create ADMIN or STAFF users."))
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', Role.STAFF)
        is_staff = True if role in [Role.ADMIN, Role.STAFF] else False
        is_superuser = True if role == Role.ADMIN else False

        user = User.objects.create_user(
            password=password,
            is_staff=is_staff,
            is_superuser=is_superuser,
            **validated_data
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        user = authenticate(request=self.context.get('request'), email=email, password=password)
        if not user:
            # Check if user exists but inactive
            user_exists = User.objects.filter(email__iexact=email).first()
            if user_exists and not user_exists.is_active:
                raise serializers.ValidationError(_("User account is inactive."))
            raise serializers.ValidationError(_("Invalid email or password."))

        attrs['user'] = user
        return attrs

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['old_password']):
            raise serializers.ValidationError({"old_password": _("Current password is not correct.")})
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": _("New passwords do not match.")})
        validate_password(attrs['new_password'], user=user)
        return attrs

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": _("Passwords do not match.")})
        validate_password(attrs['new_password'])
        return attrs

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone']

