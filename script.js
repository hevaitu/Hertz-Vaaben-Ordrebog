const STORAGE_KEY = "hertz-vaaben-orders-simple";

const statuses = [
  { key: "kommende", empty: "Ingen kommende ordrer endnu." },
  { key: "igang", empty: "Ingen ordrer i gang lige nu." },
  { key: "faerdig", empty: "Ingen færdige ordrer endnu." }
];

const initialOrders = [
  {
    id: crypto.randomUUID(),
    customer: "Eksempel A/S",
    orderName: "Rammeordre på standardrammer",
    status: "igang",
    deliveryDate: "",
    note: "Kort note kan skrives her."
  }
];

let orders = loadOrders();

const elements = {
  form: document.querySelector("#orderForm"),
  formTitle: document.querySelector("#formTitle"),
  resetForm: document.querySelector("#resetForm"),
  exportCsv: document.querySelector("#exportCsv"),
  template: document.querySelector("#orderTemplate"),
  columns: {
    kommende: document.querySelector("#kommendeOrders"),
    igang: document.querySelector("#igangOrders"),
    faerdig: document.querySelector("#faerdigOrders")
  },
  counts: {
    kommende: document.querySelector("#kommendeCount"),
    igang: document.querySelector("#igangCount"),
    faerdig: document.querySelector("#faerdigCount")
  },
  fields: {
    id: document.querySelector("#orderId"),
    customer: document.querySelector("#customer"),
    orderName: document.querySelector("#orderName"),
    status: document.querySelector("#status"),
    deliveryDate: document.querySelector("#deliveryDate"),
    note: document.querySelector("#note")
  }
};

function loadOrders() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return initialOrders;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeOrder) : initialOrders;
  } catch {
    return initialOrders;
  }
}

function normalizeOrder(order) {
  const statusMap = {
    aktiv: "igang",
    afventer: "kommende",
    afsluttet: "faerdig"
  };

  return {
    id: order.id || crypto.randomUUID(),
    customer: order.customer || "",
    orderName: order.orderName || "",
    status: statusMap[order.status] || order.status || "kommende",
    deliveryDate: order.deliveryDate || "",
    note: order.note || ""
  };
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00`));
}

function render() {
  statuses.forEach(({ key, empty }) => {
    const columnOrders = orders.filter((order) => order.status === key);
    elements.columns[key].innerHTML = "";
    elements.counts[key].textContent = columnOrders.length;

    if (!columnOrders.length) {
      const emptyText = document.createElement("p");
      emptyText.className = "empty-column";
      emptyText.textContent = empty;
      elements.columns[key].append(emptyText);
      return;
    }

    columnOrders.forEach((order) => {
      elements.columns[key].append(createOrderCard(order));
    });
  });
}

function createOrderCard(order) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  node.querySelector(".customer").textContent = order.customer;
  node.querySelector("h3").textContent = order.orderName;
  node.querySelector(".date").textContent = formatDate(order.deliveryDate);
  node.querySelector(".note").textContent = order.note;
  node.querySelector(".edit").addEventListener("click", () => editOrder(order.id));
  node.querySelector(".delete").addEventListener("click", () => deleteOrder(order.id));
  return node;
}

function resetForm() {
  elements.form.reset();
  elements.fields.id.value = "";
  elements.fields.status.value = "kommende";
  elements.formTitle.textContent = "Skriv ordre ind";
  elements.fields.customer.focus();
}

function editOrder(id) {
  const order = orders.find((item) => item.id === id);
  if (!order) {
    return;
  }

  Object.entries(elements.fields).forEach(([key, field]) => {
    field.value = order[key] || "";
  });
  elements.formTitle.textContent = "Rediger ordre";
  elements.fields.customer.focus();
}

function deleteOrder(id) {
  const order = orders.find((item) => item.id === id);
  if (!order || !confirm(`Slet ordren "${order.orderName}"?`)) {
    return;
  }

  orders = orders.filter((item) => item.id !== id);
  saveOrders();
  render();
}

function handleSubmit(event) {
  event.preventDefault();

  const formOrder = {
    id: elements.fields.id.value || crypto.randomUUID(),
    customer: elements.fields.customer.value.trim(),
    orderName: elements.fields.orderName.value.trim(),
    status: elements.fields.status.value,
    deliveryDate: elements.fields.deliveryDate.value,
    note: elements.fields.note.value.trim()
  };

  const existingIndex = orders.findIndex((order) => order.id === formOrder.id);
  if (existingIndex >= 0) {
    orders[existingIndex] = formOrder;
  } else {
    orders.unshift(formOrder);
  }

  saveOrders();
  resetForm();
  render();
}

function exportCsv() {
  const statusLabels = {
    kommende: "Kommende",
    igang: "I gang",
    faerdig: "Færdig"
  };
  const rows = [
    ["Kunde", "Ordre", "Status", "Dato", "Note"],
    ...orders.map((order) => [
      order.customer,
      order.orderName,
      statusLabels[order.status] || order.status,
      order.deliveryDate,
      order.note
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ordrebog-hertz-vaaben.csv";
  link.click();
  URL.revokeObjectURL(url);
}

elements.form.addEventListener("submit", handleSubmit);
elements.resetForm.addEventListener("click", resetForm);
elements.exportCsv.addEventListener("click", exportCsv);

render();
