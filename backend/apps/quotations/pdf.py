import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_quotation_pdf(quotation):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()

    # Brand Title
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6
    )
    elements.append(Paragraph("<b>BRIGHTLOOP</b>", title_style))
    elements.append(Paragraph("Subscription Management & Financial Operations", styles['Normal']))
    elements.append(Spacer(1, 15))

    # Quotation Header details
    header_data = [
        [
            Paragraph(f"<b>QUOTATION REFERENCE:</b> {quotation.quotation_number}<br/><b>Issue Date:</b> {quotation.issue_date}<br/><b>Valid Until:</b> {quotation.expiry_date}", styles['Normal']),
            Paragraph(f"<b>CLIENT:</b><br/>{quotation.customer.company or quotation.customer.name}<br/>{quotation.customer.email}<br/>{quotation.customer.phone}", styles['Normal']),
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # Line Items Table
    table_data = [["Item / Description", "Qty", "Unit Price", "Discount", "Tax", "Total"]]
    if quotation.plan:
        table_data.append([
            f"Plan: {quotation.plan.name} ({quotation.plan.get_billing_interval_display()})",
            "1",
            f"${quotation.plan.price:,.2f}",
            "$0.00",
            "$0.00",
            f"${quotation.plan.price:,.2f}"
        ])

    for item in quotation.items.all():
        variant_desc = f" ({item.variant.name})" if item.variant else ""
        table_data.append([
            f"{item.product.name}{variant_desc}",
            str(item.quantity),
            f"${item.unit_price:,.2f}",
            f"${item.discount_amount:,.2f}",
            f"{item.tax_percentage}%",
            f"${item.line_total:,.2f}"
        ])

    item_table = Table(table_data, colWidths=[220, 40, 75, 65, 55, 85])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563EB')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 15))

    # Summary Totals
    totals_data = [
        ["Subtotal:", f"${quotation.subtotal:,.2f}"],
        ["Discounts:", f"-${quotation.discount_amount:,.2f}"],
        ["Taxes:", f"+${quotation.tax_amount:,.2f}"],
        ["Total Quoted:", f"${quotation.total_amount:,.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[450, 90])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 12),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#0F172A')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(totals_table)

    # Terms
    if quotation.terms_and_conditions:
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("<b>Terms & Conditions:</b>", styles['Normal']))
        elements.append(Paragraph(quotation.terms_and_conditions.replace('\n', '<br/>'), styles['Italic']))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

