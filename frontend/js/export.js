/**
 * CSV Export Utilities
 */

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) {
    if (window.toast) window.toast.show("No data to export", "warning");
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  if (window.toast) window.toast.show("Exported successfully", "success");
}

export function exportOrdersCSV(orders) {
  const data = orders.map(o => ({
    'Order ID': o.id,
    'Date': o.createdAt ? o.createdAt.toDate().toLocaleString() : '',
    'Customer Name': o.customerName || '',
    'Institution': o.institutionName || '',
    'Status': o.status || '',
    'Total Amount': o.totalAmount || 0
  }));
  exportToCSV('orders_export.csv', data);
}

export function exportCustomersCSV(customers) {
  const data = customers.map(c => ({
    'Customer ID': c.id,
    'Name': c.name || '',
    'Email': c.email || '',
    'Phone': c.phone || '',
    'Institution': c.institutionName || '',
    'Credit Limit': c.creditLimit || 0,
    'Status': c.status || ''
  }));
  exportToCSV('customers_export.csv', data);
}

export function exportCreditAgingCSV(accounts) {
  // Assuming accounts is a list of customer objects with balance and credit limit
  const data = accounts.map(c => ({
    'Customer Name': c.name || '',
    'Institution': c.institutionName || '',
    'Credit Limit': c.creditLimit || 0,
    'Current Balance': c.balance || 0,
    'Available Credit': (c.creditLimit || 0) - (c.balance || 0),
    'Status': (c.balance || 0) > (c.creditLimit || 0) ? 'EXCEEDED' : 'OK'
  }));
  exportToCSV('credit_aging_report.csv', data);
}
