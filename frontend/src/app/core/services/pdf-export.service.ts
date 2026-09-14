import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserResponse } from './auth.service';
import { DashboardStats, RecentTransaction } from './dashboard.service';

export interface ReportCategorySummaryItem {
  name: string;
  amount: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  /**
   * Genera y descarga el PDF de Informes & Reportes
   */
  exportReportPDF(params: {
    currentUser: UserResponse | null;
    filterAppliedLabel: string;
    totalIngresos: number;
    totalGastos: number;
    balanceNeto: number;
    tasaAhorro: number;
    gastoPromedioDiario: number;
    categoryBreakdown: ReportCategorySummaryItem[];
    transactions: RecentTransaction[];
  }): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const fileDate = today.toISOString().split('T')[0];

    // 1. Header Banner
    doc.setFillColor(11, 15, 40); // Deep Indigo
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('control', 14, 15);

    doc.setTextColor(56, 189, 248); // Cyan Accent
    doc.text('-gastos', 35, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text('SISTEMA FINANCIERO GUATEMALA — REPORTE FINANCIERO', 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(180, 190, 210);
    doc.text(`Emisión: ${dateStr}`, pageWidth - 14, 22, { align: 'right' });

    // 2. Metadata Box
    let currentY = 36;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Reporte de Ingresos, Gastos & Movimientos', 14, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const userName = params.currentUser?.name || 'Usuario';
    const userEmail = params.currentUser?.email || '';
    doc.text(`Usuario: ${userName} (${userEmail})  |  Filtro Aplicado: ${params.filterAppliedLabel}`, 14, currentY);

    // 3. Financial KPI Summary Box (4 Cards)
    currentY += 8;
    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 22;

    const kpiCards = [
      { label: 'Total Ingresos', value: `Q ${params.totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [16, 185, 129] }, // Emerald
      { label: 'Total Gastos', value: `Q ${params.totalGastos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [244, 63, 94] }, // Rose
      { label: 'Balance Neto', value: `Q ${params.balanceNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: params.balanceNeto >= 0 ? [16, 185, 129] : [239, 68, 68] },
      { label: 'Tasa de Ahorro', value: `${params.tasaAhorro}%`, color: [99, 102, 241] } // Indigo
    ];

    kpiCards.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + 3);
      // Background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'F');
      // Border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'S');

      // Top color bar
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(x, currentY, cardWidth, 2, 'F');

      // Label
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3, currentY + 8);

      // Value
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.text(kpi.value, x + 3, currentY + 16);
    });

    currentY += cardHeight + 8;

    // 4. Category Breakdown Table (Top Categories)
    if (params.categoryBreakdown && params.categoryBreakdown.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Desglose de Gastos por Categoría', 14, currentY);
      currentY += 3;

      const catHeaders = [['Categoría', 'Gasto Acumulado (Q)', '% del Total']];
      const catRows = params.categoryBreakdown.map(c => [
        c.name,
        `Q ${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${c.percentage}%`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: catHeaders,
        body: catRows,
        theme: 'grid',
        headStyles: {
          fillColor: [28, 39, 173],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 42, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 5. Detailed Transactions Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Detalle de Transacciones (${params.transactions.length})`, 14, currentY);
    currentY += 3;

    const txHeaders = [['Fecha', 'Tipo', 'Concepto / Comercio', 'Medio de Pago', 'Categoría', 'Monto (Q)']];
    const txRows = params.transactions.map(t => [
      t.date,
      t.type === 'INCOME' ? 'INGRESO' : (t.type === 'CREDIT_PAYMENT' ? 'PAGO TARJETA' : 'GASTO'),
      t.merchant ? `${t.title} (${t.merchant})` : t.title,
      (t as any).cardName ? `${(t as any).cardName} (${(t as any).cardType || ''})` : ((t as any).paymentMethodName || 'Efectivo / Cuenta'),
      t.category,
      `${t.type === 'INCOME' ? '+' : '-'} Q ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: txHeaders,
      body: txRows,
      theme: 'grid',
      headStyles: {
        fillColor: [11, 15, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 24 },
        2: { cellWidth: 50 },
        3: { cellWidth: 38 },
        4: { cellWidth: 26 },
        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `control-gastos GT — Gestión Financiera Inteligente  |  Página ${data.pageNumber} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }
    });

    // Download document directly
    doc.save(`reporte_financiero_control_gastos_${fileDate}.pdf`);
  }

  /**
   * Genera y descarga el Estado de Cuenta Ejecutivo desde el Dashboard
   */
  exportDashboardAccountStatementPDF(params: {
    currentUser: UserResponse | null;
    stats: DashboardStats;
  }): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const fileDate = today.toISOString().split('T')[0];

    // 1. Header Banner
    doc.setFillColor(11, 15, 40); // Deep Indigo
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('control', 14, 15);

    doc.setTextColor(56, 189, 248);
    doc.text('-gastos', 35, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text('ESTADO DE CUENTA EJECUTIVO & POSICIÓN PATRIMONIAL', 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(180, 190, 210);
    doc.text(`Fecha: ${dateStr}`, pageWidth - 14, 22, { align: 'right' });

    let currentY = 36;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Diagnóstico de Liquidez y Balance Patrimonial', 14, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const userName = params.currentUser?.name || 'Usuario';
    const userEmail = params.currentUser?.email || '';
    doc.text(`Titular: ${userName} (${userEmail})  |  Moneda: Quetzales de Guatemala (GTQ - Q)`, 14, currentY);

    // 2. Liquidity Cards Grid
    currentY += 8;
    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 22;

    const cardsList = params.stats.tarjetas || [];
    const saldoBancos = cardsList.filter(c => c.type === 'DEBIT' || c.type === 'SAVINGS').reduce((sum, c) => sum + (c.balance || 0), 0);
    const deudaTotalTarjetas = cardsList.filter(c => c.type === 'CREDIT').reduce((sum, c) => sum + (c.currentDebt || 0), 0);

    const cardsData = [
      { label: 'Saldo Libre Disponible', val: `Q ${(params.stats.saldoDisponible || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [56, 189, 248] }, // Cyan
      { label: 'Efectivo en Mano/Caja', val: `Q ${(params.stats.saldoEfectivo || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [16, 185, 129] }, // Green
      { label: 'Cuentas Bancarias', val: `Q ${saldoBancos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [99, 102, 241] }, // Indigo
      { label: 'Deuda en Tarjetas', val: `Q ${deudaTotalTarjetas.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [244, 63, 94] } // Rose
    ];

    cardsData.forEach((kpi, idx) => {
      const x = 14 + idx * (cardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'S');

      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(x, currentY, cardWidth, 2, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3, currentY + 8);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.text(kpi.val, x + 3, currentY + 16);
    });

    currentY += cardHeight + 8;

    // 3. Accounts & Cards Table
    if (cardsList.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Cuentas Bancarias & Tarjetas Registradas', 14, currentY);
      currentY += 3;

      const accountHeaders = [['Institución / Nombre', 'Tipo', 'Número', 'Saldo / Límite', 'Deuda Actual', 'Crédito Disp.', 'Corte / Pago']];
      const accountRows = cardsList.map(c => [
        c.name,
        c.type === 'CREDIT' ? 'CRÉDITO' : (c.type === 'DEBIT' ? 'DÉBITO' : (c.type === 'SAVINGS' ? 'AHORRO' : 'EFECTIVO')),
        c.cardNumberMask || '****',
        c.type === 'CREDIT' ? `Límite Q ${(c.creditLimit || 0).toFixed(2)}` : `Q ${(c.balance || 0).toFixed(2)}`,
        c.type === 'CREDIT' ? `Q ${(c.currentDebt || 0).toFixed(2)}` : 'N/A',
        c.type === 'CREDIT' ? `Q ${(c.availableCredit || 0).toFixed(2)}` : 'N/A',
        c.type === 'CREDIT' && c.billingCutDay ? `Corte: ${c.billingCutDay} | Vence: ${c.paymentDueDay || 'N/A'}` : 'N/A'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: accountHeaders,
        body: accountRows,
        theme: 'grid',
        headStyles: {
          fillColor: [28, 39, 173],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 4. Savings Goals & Recurring Expenses Summary
    const hasGoals = params.stats.metasAhorro && params.stats.metasAhorro.length > 0;
    if (hasGoals) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Metas de Ahorro & Fondos Blindados', 14, currentY);
      currentY += 3;

      const goalHeaders = [['Meta', 'Categoría', 'Meta Objetivo (Q)', 'Monto Ahorrado (Q)', '% de Avance']];
      const goalRows = params.stats.metasAhorro!.map(g => {
        const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
        return [
          g.name,
          g.category,
          `Q ${g.targetAmount.toFixed(2)}`,
          `Q ${g.currentAmount.toFixed(2)}`,
          `${pct}%`
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: goalHeaders,
        body: goalRows,
        theme: 'grid',
        headStyles: {
          fillColor: [124, 58, 237], // Purple
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 5. Recent Transactions
    if (params.stats.transaccionesRecientes && params.stats.transaccionesRecientes.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Últimos Movimientos Registrados', 14, currentY);
      currentY += 3;

      const recentHeaders = [['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Monto (Q)']];
      const recentRows = params.stats.transaccionesRecientes.slice(0, 15).map(t => [
        t.date,
        t.type === 'INCOME' ? 'INGRESO' : (t.type === 'CREDIT_PAYMENT' ? 'PAGO TARJETA' : 'GASTO'),
        t.title,
        t.category,
        `${t.type === 'INCOME' ? '+' : '-'} Q ${t.amount.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: recentHeaders,
        body: recentRows,
        theme: 'grid',
        headStyles: {
          fillColor: [11, 15, 40],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          const pageCount = (doc.internal as any).getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(
            `control-gastos GT — Estado de Cuenta Ejecutivo  |  Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
          );
        }
      });
    }

    doc.save(`estado_cuenta_control_gastos_${fileDate}.pdf`);
  }
}
