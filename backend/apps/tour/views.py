from rest_framework import permissions, serializers, views
from rest_framework.response import Response

from .models import TourPreference


class TourSerializer(serializers.Serializer):
    completed = serializers.BooleanField(required=False)
    never_show = serializers.BooleanField(required=False)


class TourView(views.APIView):
    """Each signed-in user reads and updates only their own tour preference."""
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _payload(pref):
        return {
            'role': pref.user.role,
            'completed': pref.completed,
            'never_show': pref.never_show,
            # The tour opens by itself only until the user finishes it or opts out.
            'show_automatically': not (pref.completed or pref.never_show),
        }

    def get(self, request):
        pref, _ = TourPreference.objects.get_or_create(user=request.user)
        return Response(self._payload(pref))

    def patch(self, request):
        serializer = TourSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pref, _ = TourPreference.objects.get_or_create(user=request.user)
        for field, value in serializer.validated_data.items():
            setattr(pref, field, value)
        pref.save()
        return Response(self._payload(pref))
