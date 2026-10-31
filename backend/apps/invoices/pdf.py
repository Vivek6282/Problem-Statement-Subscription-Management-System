import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_invoice_pdf(invoice):
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
        spaceAfter=4
    )
    elements.append(Paragraph("<b>BRIGHTLOOP</b>", title_style))
    elements.append(Paragraph("Subscription Billing & Financial Engine", styles['Normal']))
    elements.append(Spacer(1, 15))

    # Header section: Invoice metadata & Customer metadata
    status_color = '#16A34A' if invoice.status == 'PAID' else ('#DC2626' if invoice.status == 'OVERDUE' else '#2563EB')
    period_str = f"{invoice.billing_period_start} to {invoice.billing_period_end}" if invoice.billing_period_start else "N/A"

    header_data = [
        [
            Paragraph(
                f"<b>INVOICE:</b> {invoice.invoice_number}<br/>"
                f"<b>Status:</b> <font color='{status_color}'><b>{invoice.get_status_display()}</b></font><br/>"
                f"<b>Issue Date:</b> {invoice.issue_date}<br/>"
                f"<b>Due Date:</b> {invoice.due_date}<br/>"
                f"<b>Period:</b> {period_str}",
                styles['Normal']
            ),
            Paragraph(
                f"<b>BILLED TO:</b><br/>"
                f"<b>{invoice.customer.company or invoice.customer.name}</b><br/>"
                f"Attn: {invoice.customer.name}<br/>"
                f"{invoice.customer.email}<br/>"
                f"{invoice.customer.phone or ''}<br/>"
                f"{invoice.customer.address_line1 or ''} {invoice.customer.city or ''}",
                styles['Normal']
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # Items table
    table_data = [["Item / Description", "SKU", "Qty", "Unit Price", "Discount", "Tax", "Amount"]]
    for item in invoice.items.all():
        variant_desc = f" ({item.variant_name})" if item.variant_name else ""
        table_data.append([
            f"{item.product_name}{variant_desc}",
            item.product_sku or "-",
            str(item.quantity),
            f"${item.unit_price:,.2f}",
            f"${item.discount_amount:,.2f}",
            f"${item.tax_amount:,.2f}",
            f"${item.line_total:,.2f}"
        ])

    item_table = Table(table_data, colWidths=[180, 70, 35, 65, 60, 55, 75])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 15))

    # Summary Totals
    totals_data = [
        ["Subtotal:", f"${invoice.subtotal:,.2f}"],
        ["Discounts:", f"-${invoice.discount_amount:,.2f}"],
        ["Taxes:", f"+${invoice.tax_amount:,.2f}"],
        ["Total Amount:", f"${invoice.total_amount:,.2f}"],
        ["Total Paid:", f"${invoice.paid_amount:,.2f}"],
        ["Balance Due:", f"${invoice.balance_due:,.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[445, 95])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 11),
        ('TEXTCOLOR', (0,-1), (-1,-1), colors.HexColor(status_color)),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#0F172A')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(totals_table)

    if invoice.notes:
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(f"<b>Notes:</b> {invoice.notes}", styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

