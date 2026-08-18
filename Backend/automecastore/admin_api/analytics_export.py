"""
Exports du Centre d'Analyse (CSV, Excel, PDF).
"""
import csv
import io
from datetime import datetime

from django.http import HttpResponse
from rest_framework.views import APIView

from account.permissions import IsAdmin
from .analytics import AdminAnalyticsView


class AdminAnalyticsExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        fmt = request.query_params.get('format', 'csv').lower()
        if fmt not in ('csv', 'excel', 'xlsx', 'pdf'):
            fmt = 'csv'

        analytics = AdminAnalyticsView()
        data = analytics.get(request).data

        if fmt == 'csv':
            return self._export_csv(data, request.query_params.get('period', 'rapport'))

        if fmt in ('excel', 'xlsx'):
            return self._export_excel(data, request.query_params.get('period', 'rapport'))

        return self._export_pdf(data, request.query_params.get('period', 'rapport'))

    def _flatten(self, data):
        """Aplatit les données pour un export tabulaire simple."""
        rows = []
        periode = data.get('periode_label', 'Analyse')

        kpis = data.get('kpis', {})
        rows.append(['Rapport AutoMecaStore - Centre d\'Analyse', periode, 'Généré le', datetime.now().strftime('%d/%m/%Y %H:%M')])
        rows.append([])
        rows.append(['KPI', 'Valeur'])
        for k, v in kpis.items():
            rows.append([self._label_kpi(k), v])

        evolutions = data.get('evolutions', [])
        if evolutions:
            rows.append([])
            rows.append(['Évolutions', 'CA', 'Ventes', 'Commandes', 'Nouveaux clients', 'Nouveaux magasins', 'Nouveaux produits'])
            for e in evolutions:
                rows.append([e['label'], e['ca'], e['ventes'], e['commandes'], e['clients_nouveaux'], e['magasins_nouveaux'], e['produits_nouveaux']])

        produits = data.get('produits', {})
        for key, items in produits.items():
            if items:
                rows.append([])
                rows.append([self._label_section(key)])
                for item in items:
                    rows.append(list(item.values()))

        magasins = data.get('magasins', {})
        for key, items in magasins.items():
            if items:
                rows.append([])
                rows.append([self._label_section(key)])
                for item in items:
                    rows.append(list(item.values()))

        geo = data.get('geographie', {})
        for key, items in geo.items():
            if items:
                rows.append([])
                rows.append([self._label_section(key)])
                for item in items:
                    rows.append(list(item.values()))

        return rows

    def _label_kpi(self, k):
        labels = {
            'chiffre_affaires_jour': 'CA du jour',
            'chiffre_affaires_mois': 'CA du mois',
            'chiffre_affaires_annee': 'CA annuel',
            'chiffre_affaires_total': 'CA période',
            'chiffre_affaires_precedent': 'CA période précédente',
            'total_commandes': 'Total commandes',
            'commandes_terminees': 'Commandes terminées',
            'commandes_annulees': 'Commandes annulées',
            'total_clients': 'Total clients',
            'total_fournisseurs': 'Total magasins',
            'total_produits': 'Total produits',
            'taux_satisfaction': 'Taux satisfaction',
            'panier_moyen': 'Panier moyen',
            'taux_annulation': 'Taux annulation (%)',
        }
        return labels.get(k, k)

    def _label_section(self, k):
        labels = {
            'top_10_vendus': 'Top 10 produits les plus vendus',
            'top_10_vus': 'Top 10 produits les plus consultés',
            'produits_moins_vendus': 'Produits les moins vendus',
            'produits_rupture': 'Produits en rupture',
            'top_10_revenus': 'Produits générant le plus de revenus',
            'top_ca': 'Top magasins par CA',
            'top_commandes': 'Top magasins par commandes',
            'top_satisfaction': 'Top magasins par satisfaction',
            'plus_actifs': 'Magasins les plus actifs',
            'attention': 'Magasins nécessitant une attention',
            'nouveaux': 'Nouveaux clients',
            'fideles': 'Clients fidèles',
            'inactifs': 'Clients inactifs',
            'commandes_par_ville': 'Commandes par ville',
            'magasins_par_ville': 'Magasins par ville',
            'clients_par_ville': 'Clients par ville',
        }
        return labels.get(k, k)

    def _export_csv(self, data, period_label):
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';', lineterminator='\n')
        for row in self._flatten(data):
            writer.writerow(row)

        filename = f"automeca-analyse-{period_label}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"
        response = HttpResponse(output.getvalue().encode('utf-8-sig'), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    def _export_excel(self, data, period_label):
        try:
            from openpyxl import Workbook
            wb = Workbook()
            ws = wb.active
            ws.title = 'Analyse'
            for row in self._flatten(data):
                ws.append(row)

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)

            filename = f"automeca-analyse-{period_label}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.xlsx"
            response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except ImportError:
            return HttpResponse("openpyxl n'est pas installé. Export Excel indisponible.", status=501)

    def _export_pdf(self, data, period_label):
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet

            output = io.BytesIO()
            doc = SimpleDocTemplate(output, pagesize=landscape(A4), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
            styles = getSampleStyleSheet()
            story = [
                Paragraph(f"<b>AutoMecaStore - Centre d'Analyse</b> - {data.get('periode_label', '')}", styles['Title']),
                Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']),
                Spacer(1, 12),
            ]

            for row in self._flatten(data):
                if not row:
                    story.append(Spacer(1, 6))
                    continue
                if len(row) == 1:
                    story.append(Paragraph(f"<b>{row[0]}</b>", styles['Heading2']))
                else:
                    story.append(Table([row], colWidths=[120] * len(row)))

            doc.build(story)
            output.seek(0)

            filename = f"automeca-analyse-{period_label}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.pdf"
            response = HttpResponse(output.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except ImportError:
            return HttpResponse("reportlab n'est pas installé. Export PDF indisponible.", status=501)
