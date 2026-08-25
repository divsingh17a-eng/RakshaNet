const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } = require('docx');
const { RelocationPlan, RelocationAllocation, Habitation, SafeSite } = require('../models/sql');

async function fetchRows(status) {
  const where = status ? { status } : {};
  const plans = await RelocationPlan.findAll({
    where,
    include: [
      { model: Habitation, as: 'habitation' },
      { model: RelocationAllocation, as: 'allocations', include: [{ model: SafeSite, as: 'site' }] }
    ],
    order: [['rankScore', 'DESC']]
  });

  return plans.map((p) => ({
    habitation: p.habitation?.name || 'Unknown',
    district: p.habitation?.district || '',
    zone: p.zoneSnapshot,
    hvi: p.hviSnapshot,
    priorityTier: p.priorityTier,
    status: p.status,
    affectedPopulation: p.affectedPopulation,
    priorityPopulation: p.priorityPopulation,
    sites: p.allocations.map((a) => `${a.site?.name || 'Unassigned'} (${a.population})`).join(', ') || 'Unassigned',
    approvedAt: p.approvedAt ? p.approvedAt.toISOString().slice(0, 10) : ''
  }));
}

// GET /api/reports/relocation?format=json|csv|pdf|docx (FR-20).
async function exportRelocationReport(req, res) {
  const { format = 'json', status } = req.query;
  const rows = await fetchRows(status);

  if (format === 'csv') {
    const columns = ['habitation', 'district', 'zone', 'hvi', 'priorityTier', 'status', 'affectedPopulation', 'priorityPopulation', 'sites', 'approvedAt'];
    const header = columns.join(',');
    const body = rows.map((row) => columns.map((c) => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rakshanet-relocation-report.csv"');
    return res.send(`${header}\n${body}`);
  }

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rakshanet-relocation-report.pdf"');
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(18).text('RakshaNet - Relocation & Resource Plan', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('gray').text(`Generated ${new Date().toISOString()} by ${req.user.name || req.user.id}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('black');

    rows.forEach((row, i) => {
      doc.fontSize(13).text(`${i + 1}. ${row.habitation} (${row.district})`, { underline: true });
      doc.fontSize(10).text(`Zone: ${row.zone} | HVI: ${row.hvi} | Priority: ${row.priorityTier} | Status: ${row.status}`);
      doc.text(`Affected: ${row.affectedPopulation} | Prioritized: ${row.priorityPopulation}`);
      doc.text(`Destination(s): ${row.sites}`);
      if (row.approvedAt) doc.text(`Approved: ${row.approvedAt}`);
      doc.moveDown();
    });

    if (rows.length === 0) doc.fontSize(11).text('No relocation plans match the given filter.');
    doc.end();
    return undefined;
  }

  if (format === 'docx') {
    const headerRow = new TableRow({
      children: ['Habitation', 'District', 'Zone', 'HVI', 'Tier', 'Status', 'Affected', 'Priority', 'Site(s)'].map(
        (t) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] })
      )
    });
    const dataRows = rows.map((row) => new TableRow({
      children: [row.habitation, row.district, row.zone, String(row.hvi), row.priorityTier, row.status, String(row.affectedPopulation), String(row.priorityPopulation), row.sites].map(
        (t) => new TableCell({ children: [new Paragraph(t)] })
      )
    }));

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'RakshaNet - Relocation & Resource Plan', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Generated ${new Date().toISOString()} by ${req.user.name || req.user.id}` }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="rakshanet-relocation-report.docx"');
    return res.send(buffer);
  }

  return res.json({
    success: true,
    generatedAt: new Date().toISOString(),
    generatedBy: req.user.name || req.user.id,
    reportTitle: 'RakshaNet Relocation & Resource Plan',
    totalPlans: rows.length,
    rows
  });
}

module.exports = { exportRelocationReport };
