const REWARD_KEY='casa-en-cuenta-reward-programs-v1';
let rewardPrograms=loadRewardProgramsLocal(),editingRewardId=null,rewardSyncMigration=false,pointsInputDirty=false;

function loadRewardProgramsLocal(){try{const rows=JSON.parse(localStorage.getItem(REWARD_KEY));return Array.isArray(rows)?rows:[]}catch{return[]}}
function saveRewardProgramsLocal(){localStorage.setItem(REWARD_KEY,JSON.stringify(rewardPrograms))}
function formatPointCount(value){return new Intl.NumberFormat('es-SV',{maximumFractionDigits:0}).format(Number(value)||0)}
function formatPointsDate(value){if(!value)return'';return new Date(value).toLocaleDateString('es-SV',{day:'numeric',month:'long',year:'numeric'})}
function renderRewardPrograms(){
  const list=document.getElementById('reward-program-list'),select=document.getElementById('points-program-select');
  if(!list||!select)return;
  const selected=select.value;
  select.innerHTML=rewardPrograms.length?rewardPrograms.map(program=>`<option value="${esc(program.id)}">${esc(program.name)}${program.bank?` · ${esc(program.bank)}`:''}</option>`).join(''):'<option value="">Primero agregá una tarjeta en Ajustes</option>';
  if(rewardPrograms.some(program=>program.id===selected))select.value=selected;
  list.innerHTML=rewardPrograms.length?rewardPrograms.map(program=>`<div class="store-setting-row reward-program-row"><span class="store-setting-icon">💳</span><span class="store-setting-main"><strong>${esc(program.name)}${program.bank?` · ${esc(program.bank)}`:''}</strong><small>${money(Number(program.cashPerThousand)/1000)} por punto · ${money(program.cashPerThousand)} por cada 1,000 puntos${program.balanceUpdatedAt?` · Saldo: ${formatPointCount(program.balancePoints)} puntos, actualizado ${formatPointsDate(program.balanceUpdatedAt)}`:' · Saldo pendiente de actualizar'}</small></span><button class="reward-edit" type="button" data-edit-reward="${esc(program.id)}">Editar</button><button class="store-setting-toggle" type="button" data-remove-reward="${esc(program.id)}">Quitar</button></div>`).join(''):'<p class="plan-empty">Agregá la tarjeta que usás y el valor de canje que indica tu banco.</p>';
  list.querySelectorAll('[data-edit-reward]').forEach(button=>button.onclick=()=>editRewardProgram(button.dataset.editReward));
  list.querySelectorAll('[data-remove-reward]').forEach(button=>button.onclick=()=>void removeRewardProgram(button.dataset.removeReward));
  const selectedProgram=rewardPrograms.find(program=>program.id===select.value);
  if(!pointsInputDirty){const balance=document.getElementById('points-balance');balance.value=selectedProgram?.balanceUpdatedAt?String(selectedProgram.balancePoints):''}
  renderPointsValue();
}
function renderPointsValue(){
  const select=document.getElementById('points-program-select'),balance=document.getElementById('points-balance'),value=document.getElementById('points-cash-value'),hint=document.getElementById('points-rate-hint'),updated=document.getElementById('points-updated-at');
  if(!select||!balance||!value||!hint||!updated)return;
  const program=rewardPrograms.find(item=>item.id===select.value),points=Math.max(0,Number(balance.value)||0);
  value.textContent=money(program?points*Number(program.cashPerThousand)/1000:0);
  hint.textContent=program?`${program.name}${program.bank?` · ${program.bank}`:''}`:'Configurá el valor de tus puntos en Ajustes.';
  updated.textContent=program?.balanceUpdatedAt?`Última actualización: ${formatPointsDate(program.balanceUpdatedAt)}`:'Todavía no actualizás el saldo de esta tarjeta.';
}
async function savePointsBalance(){
  const program=rewardPrograms.find(item=>item.id===document.getElementById('points-program-select').value),input=document.getElementById('points-balance');
  if(!program){toast('Agregá primero una tarjeta en Ajustes.');return}
  const points=Number(input.value);if(input.value.trim()===''||!Number.isInteger(points)||points<0){toast('Anotá cuántos puntos tenés; podés poner 0 si ya los canjeaste.');input.focus();return}
  program.balancePoints=points;program.balanceUpdatedAt=new Date().toISOString();pointsInputDirty=false;saveRewardProgramsLocal();renderRewardPrograms();
  const synced=await saveRewardProgram(program);toast(synced?'Saldo de puntos actualizado y compartido. ¡Cabal!':'Saldo guardado aquí; se compartirá al reconectar.');
}
function editRewardProgram(id){
  const program=rewardPrograms.find(item=>item.id===id),form=document.getElementById('reward-program-form');if(!program||!form)return;
  editingRewardId=id;form.elements.name.value=program.name;form.elements.bank.value=program.bank||'';form.elements.cashPerThousand.value=program.cashPerThousand;
  form.querySelector('[type=submit]').innerHTML='Guardar cambios <span>✓</span>';
  let cancel=form.querySelector('[data-cancel-reward]');if(!cancel){cancel=document.createElement('button');cancel.type='button';cancel.dataset.cancelReward='';cancel.className='reward-cancel';cancel.textContent='Cancelar';form.append(cancel);cancel.onclick=()=>resetRewardForm()}
  form.scrollIntoView({behavior:'smooth',block:'center'});form.elements.name.focus();
}
function resetRewardForm(){const form=document.getElementById('reward-program-form');if(!form)return;editingRewardId=null;form.reset();form.querySelector('[type=submit]').innerHTML='Agregar tarjeta <span>＋</span>';form.querySelector('[data-cancel-reward]')?.remove()}
function rewardCloudRow(program){return{household_id:cloudHousehold.id,id:program.id,name:program.name,bank:program.bank||'',cash_per_thousand:Number(program.cashPerThousand),balance_points:Number(program.balancePoints)||0,balance_updated_at:program.balanceUpdatedAt||null}}
async function saveRewardProgram(program){
  if(!cloudClient||!cloudHousehold){setSyncLabel('Tarjetas guardadas en este dispositivo');return false}
  setSyncLabel('Guardando tarjetas…');const{error}=await cloudClient.from('household_reward_programs').upsert(rewardCloudRow(program),{onConflict:'household_id,id'});
  setSyncLabel(error?'Tarjetas guardadas aquí · pendiente de sincronizar':'Hogar sincronizado');if(error)toast('No se pudieron sincronizar las tarjetas. Revisá la conexión.');return !error;
}
async function removeRewardProgram(id){
  const program=rewardPrograms.find(item=>item.id===id);if(!program)return;
  rewardPrograms=rewardPrograms.filter(item=>item.id!==id);saveRewardProgramsLocal();renderRewardPrograms();
  if(cloudClient&&cloudHousehold){const{error}=await cloudClient.from('household_reward_programs').delete().eq('household_id',cloudHousehold.id).eq('id',id);if(error)toast('No pude quitarla de la cuenta compartida. Revisá la conexión.');else setSyncLabel('Hogar sincronizado')}
  if(editingRewardId===id)resetRewardForm();toast(`${program.name} ya no aparece en tus tarjetas.`);
}
async function loadRewardPrograms(preferCloud=false){
  if(!cloudClient||!cloudHousehold){renderRewardPrograms();return}
  const{data:rows,error}=await cloudClient.from('household_reward_programs').select('id,name,bank,cash_per_thousand,balance_points,balance_updated_at').eq('household_id',cloudHousehold.id);
  if(error){renderRewardPrograms();return}
  if(!rows.length&&rewardPrograms.length&&!preferCloud){rewardSyncMigration=true;let saved=true;for(const program of [...rewardPrograms])if(!await saveRewardProgram(program)){saved=false;break}rewardSyncMigration=false;if(saved)await loadRewardPrograms(true);return}
  rewardPrograms=rows.map(row=>({id:row.id,name:row.name,bank:row.bank||'',cashPerThousand:Number(row.cash_per_thousand),balancePoints:Number(row.balance_points)||0,balanceUpdatedAt:row.balance_updated_at||null}));saveRewardProgramsLocal();renderRewardPrograms();
}
window.loadRewardPrograms=loadRewardPrograms;

window.handleRewardProgramSubmit=async event=>{
  event.preventDefault();const form=event.currentTarget,existing=rewardPrograms.find(program=>program.id===editingRewardId);
  const program={id:existing?.id||`reward-${crypto.randomUUID?crypto.randomUUID():Date.now()}`,name:form.elements.name.value.trim(),bank:form.elements.bank.value.trim(),cashPerThousand:Number(form.elements.cashPerThousand.value),balancePoints:Number(existing?.balancePoints)||0,balanceUpdatedAt:existing?.balanceUpdatedAt||null};
  if(!program.name||!(program.cashPerThousand>0))return;
  if(existing)rewardPrograms=rewardPrograms.map(item=>item.id===existing.id?program:item);else rewardPrograms.push(program);
  saveRewardProgramsLocal();renderRewardPrograms();resetRewardForm();await saveRewardProgram(program);toast(existing?'Tarjeta actualizada.':'Tarjeta agregada. ¡Cabal!');
};
document.getElementById('points-program-select').onchange=()=>{pointsInputDirty=false;renderRewardPrograms()};
document.getElementById('points-balance').oninput=()=>{pointsInputDirty=true;renderPointsValue()};
document.getElementById('save-points-balance').onclick=()=>void savePointsBalance();
renderRewardPrograms();
if(new URLSearchParams(location.search).has('cashPerThousand'))history.replaceState(null,'',location.pathname+location.hash);

