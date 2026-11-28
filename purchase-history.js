let purchaseBeingEdited = null;
const originalRenderHistory = renderHistory;

function renderHistoryWithActions() {
  originalRenderHistory();
  const purchases = [...data.purchases].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  document.querySelectorAll('.history-card').forEach((card, index) => {
    const purchase = purchases[index];
    if (!purchase) return;
    card.dataset.purchaseId = purchase.id;
    const actions = document.createElement('div');
    actions.className = 'history-actions';
    actions.innerHTML = `<button type="button" class="history-edit" data-edit-purchase="${esc(purchase.id)}">Editar compra</button><button type="button" class="history-delete" data-delete-purchase="${esc(purchase.id)}">Eliminar</button>`;
    card.append(actions);
  });
  document.querySelectorAll('[data-edit-purchase]').forEach(button => button.onclick = () => openPurchaseEditor(button.dataset.editPurchase));
  document.querySelectorAll('[data-delete-purchase]').forEach(button => button.onclick = () => void deletePurchase(button.dataset.deletePurchase));
}
renderHistory = renderHistoryWithActions;

function openPurchaseEditor(id) {
  const purchase = data.purchases.find(row => row.id === id);
  if (!purchase) return;
  purchaseBeingEdited = JSON.parse(JSON.stringify(purchase));
  const storeSelect = document.getElementById('edit-purchase-store');
  const allStores = [...STORES];
  if (!allStores.some(store => store.id === purchase.store)) allStores.push({ id: purchase.store, name: purchase.storeName || purchase.store, active: true });
  storeSelect.innerHTML = allStores.map(store => `<option value="${esc(store.id)}">${esc(store.name)}</option>`).join('');
  storeSelect.value = purchase.store;
  document.getElementById('edit-purchase-date').value = purchase.date;
  document.getElementById('edit-purchase-note').value = purchase.note || '';
  renderEditableItems();
  document.getElementById('purchase-edit-modal').hidden = false;
  document.getElementById('edit-purchase-store').focus();
}

function closePurchaseEditor() {
  document.getElementById('purchase-edit-modal').hidden = true;
  purchaseBeingEdited = null;
}

function renderEditableItems() {
  const list = document.getElementById('edit-purchase-items');
  if (!purchaseBeingEdited.items.length) {
    list.innerHTML = '<p class="edit-empty">Quitaste todos los productos. Agregá uno nuevo o eliminá la compra completa.</p>';
  } else {
    list.innerHTML = purchaseBeingEdited.items.map((item, index) => `<div class="edit-item-row" data-edit-item="${index}"><label>Producto<input data-field="name" value="${esc(item.name)}" maxlength="80" required></label><label>Precio c/u<input data-field="price" type="number" min="0.01" step="0.01" inputmode="decimal" value="${Number(item.price)||0}" required></label><label>Cantidad<input data-field="qty" type="number" min="0.01" step="0.01" inputmode="decimal" value="${Number(item.qty)||1}" required></label><label>Categoría<select data-field="category">${CATEGORIES.map(([name]) => `<option ${item.category===name?'selected':''}>${esc(name)}</option>`).join('')}</select></label><button type="button" class="edit-item-remove" data-remove-edit-item="${index}" aria-label="Quitar ${esc(item.name)}">×</button></div>`).join('');
  }
  updateEditedTotal();
  list.querySelectorAll('[data-field]').forEach(field => field.oninput = field.onchange = () => {
    const row = field.closest('[data-edit-item]');
    const item = purchaseBeingEdited.items[Number(row.dataset.editItem)];
    item[field.dataset.field] = ['price','qty'].includes(field.dataset.field) ? Number(field.value) : field.value;
    updateEditedTotal();
  });
  list.querySelectorAll('[data-remove-edit-item]').forEach(button => button.onclick = () => {
    purchaseBeingEdited.items.splice(Number(button.dataset.removeEditItem), 1);
    renderEditableItems();
  });
}

function updateEditedTotal() {
  const total = purchaseBeingEdited.items.reduce((sum, item) => sum + (Number(item.price)||0) * (Number(item.qty)||0), 0);
  document.getElementById('edit-purchase-total').textContent = money(total);
  document.getElementById('save-purchase-edit').disabled = !purchaseBeingEdited.items.length || purchaseBeingEdited.items.some(item => !item.name.trim() || !(Number(item.price)>0) || !(Number(item.qty)>0));
}

document.getElementById('edit-add-item').onclick = () => {
  const nameField = document.getElementById('edit-new-name');
  const priceField = document.getElementById('edit-new-price');
  const quantityField = document.getElementById('edit-new-quantity');
  const name = nameField.value.trim(), price = Number(priceField.value), qty = Number(quantityField.value);
  if (!name || !(price > 0) || !(qty > 0)) { toast('Completá producto, precio y cantidad, vos.'); return; }
  purchaseBeingEdited.items.push({ name, category: document.getElementById('edit-new-category').value, price, qty });
  nameField.value = ''; priceField.value = ''; quantityField.value = '1';
  renderEditableItems(); nameField.focus();
};

document.getElementById('purchase-edit-form').onsubmit = async event => {
  event.preventDefault();
  if (!purchaseBeingEdited || !purchaseBeingEdited.items.length) return;
  const purchase = data.purchases.find(row => row.id === purchaseBeingEdited.id);
  if (!purchase) return closePurchaseEditor();
  const store = storeById(document.getElementById('edit-purchase-store').value);
  const updated = { ...purchaseBeingEdited, store: document.getElementById('edit-purchase-store').value, storeName: store?.name || purchaseBeingEdited.storeName, date: document.getElementById('edit-purchase-date').value || purchaseBeingEdited.date, note: document.getElementById('edit-purchase-note').value.trim(), total: purchaseBeingEdited.items.reduce((sum, item) => sum + Number(item.price)*Number(item.qty), 0) };
  if (cloudClient && cloudHousehold && syncedPurchaseIds.has(updated.id)) {
    setSyncLabel('Actualizando compra…');
    const { error } = await cloudClient.from('purchases').update({ store: updated.store, store_name: updated.storeName, purchase_date: updated.date, note: updated.note || null, total: updated.total, items: updated.items.map(item => ({ name: item.name.trim(), category: item.category, unit_price: Number(item.price), quantity: Number(item.qty) })) }).eq('id', updated.id).eq('household_id', cloudHousehold.id);
    if (error) { setSyncLabel('No se pudo actualizar'); toast('No se pudo cambiar la compra sincronizada. Revisá la conexión o los permisos.'); return; }
    setSyncLabel('Hogar sincronizado');
  }
  Object.assign(purchase, updated);
  storeLocal(); closePurchaseEditor(); renderHistory(); renderPlan(); toast('Compra corregida. ¡Ya quedó cabal!');
};

document.getElementById('cancel-purchase-edit').onclick = closePurchaseEditor;\ndocument.getElementById('cancel-purchase-edit-secondary').onclick = closePurchaseEditor;\ndocument.getElementById('edit-new-category').innerHTML = CATEGORIES.map(([name]) => <option></option>).join('');
document.getElementById('purchase-edit-modal').onclick = event => { if (event.target.id === 'purchase-edit-modal') closePurchaseEditor(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.getElementById('purchase-edit-modal').hidden) closePurchaseEditor(); });

async function deletePurchase(id) {
  const purchase = data.purchases.find(row => row.id === id);
  if (!purchase) return;
  if (!window.confirm(`¿Eliminar la compra de ${purchase.storeName || purchase.store} del ${purchase.date}? Esta acción no se puede deshacer.`)) return;
  if (cloudClient && cloudHousehold && syncedPurchaseIds.has(id)) {
    setSyncLabel('Eliminando compra…');
    const { error } = await cloudClient.from('purchases').delete().eq('id', id).eq('household_id', cloudHousehold.id);
    if (error) { setSyncLabel('No se pudo eliminar'); toast('No se pudo eliminar la compra sincronizada. Revisá la conexión o los permisos.'); return; }
    syncedPurchaseIds.delete(id); setSyncLabel('Hogar sincronizado');
  }
  data.purchases = data.purchases.filter(row => row.id !== id);
  storeLocal(); renderHistory(); renderPlan(); toast('Compra eliminada del historial.');
}

renderHistory();

