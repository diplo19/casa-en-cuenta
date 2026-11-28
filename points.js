const REWARD_KEY='casa-en-cuenta-reward-programs-v1';
let rewardPrograms=loadRewardProgramsLocal(),editingRewardId=null,rewardSyncMigration=false;

function loadRewardProgramsLocal(){try{const rows=JSON.parse(localStorage.getItem(REWARD_KEY));return Array.isArray(rows)?rows:[]}catch{return[]}}
function saveRewardProgramsLocal(){localStorage.setItem(REWARD_KEY,JSON.stringify(rewardPrograms))}
function renderRewardPrograms(){
  const list=document.getElementById('reward-program-list'),select=document.getElementById('points-program-select');
  if(!list||!select)return;
  const selected=select.value;
  select.innerHTML=rewardPrograms.length?rewardPrograms.map(program=>`<option value="${esc(program.id)}">${esc(program.name)}${program.bank?` · ${esc(program.bank)}`:''}</option>`).join(''):'<option value="">Primero agregá una tarjeta en Ajustes</option>';
  if(rewardPrograms.some(program=>program.id===selected))select.value=selected;
  list.innerHTML=rewardPrograms.length?rewardPrograms.map(program=>`<div class="store-setting-row reward-program-row"><span class="store-setting-icon">💳</span><span class="store-setting-main"><strong>${esc(program.name)}${program.bank?` · ${esc(program.bank)}`:''}</strong><small>${money(Number(program.cashPerThousand)/1000)} por punto · ${money(program.cashPerThousand)} por cada 1,000 puntos</small></span><button class="reward-edit" type="button" data-edit-reward="${esc(program.id)}">Editar</button><button class="store-setting-toggle" type="button" data-remove-reward="${esc(program.id)}">Quitar</button></div>`).join(''):'<p class="plan-empty">Agregá la tarjeta que usás y el valor de canje que indica tu banco.</p>';
  list.querySelectorAll('[data-edit-reward]').forEach(button=>button.onclick=()=>editRewardProgram(button.dataset.editReward));
  list.querySelectorAll('[data-remove-reward]').forEach(button=>button.onclick=()=>void removeRewardProgram(button.dataset.removeReward));
  renderPointsValue();
}
function renderPointsValue(){
  const select=document.getElementById('points-program-select'),balance=document.getElementById('points-balance'),value=document.getElementById('points-cash-value'),hint=document.getElementById('points-rate-hint');
  if(!select||!balance||!value||!hint)return;
  const program=rewardPrograms.find(item=>item.id===select.value),points=Math.max(0,Number(balance.value)||0);
  value.textContent=money(program?points*Number(program.cashPerThousand)/1000:0);
  hint.textContent=program?`${program.name}${program.bank?` · ${program.bank}`:''}: 'Configurá el valor de tus puntos en Ajustes.';
}
function editRewardProgram(id){
  const program=rewardPrograms.find(item=>item.id===id),form=document.getElementById('reward-program-form');if(!program||!form)return;
  editingRewardId=id;form.elements.name.value=program.name;form.elements.bank.value=program.bank||'';form.elements.cashPerThousand.value=program.cashPerThousand;
  form.querySelector('[type=submit]').innerHTML='Guardar cambios <span>✓</span>';
  let cancel=form.querySelector('[data-cancel-reward]');if(!cancel){cancel=document.createElement('button');cancel.type='button';cancel.dataset.cancelReward='';cancel.className='reward-cancel';cancel.textContent='Cancelar';form.append(cancel);cancel.onclick=()=>resetRewardForm()}
  form.scrollIntoView({behavior:'smooth',block:'center'});form.elements.name.focus();
}
function resetRewardForm(){const form=document.getElementById('reward-program-form');if(!form)return;editingRewardId=null;form.reset();form.querySelector('[type=submit]').innerHTML='Agregar tarjeta <span>＋</span>';form.querySelector('[data-cancel-reward]')?.remove()}
function rewardCloudRow(program){return{household_id:cloudHousehold.id,id:program.id,name:program.name,bank:program.bank||'',cash_per_thousand:Number(program.cashPerThousand)}}
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
  const{data:rows,error}=await cloudClient.from('household_reward_programs').select('id,name,bank,cash_per_thousand').eq('household_id',cloudHousehold.id);
  if(error){renderRewardPrograms();return}
  if(!rows.length&&rewardPrograms.length&&!preferCloud){rewardSyncMigration=true;let saved=true;for(const program of [...rewardPrograms])if(!await saveRewardProgram(program)){saved=false;break}rewardSyncMigration=false;if(saved)await loadRewardPrograms(true);return}
  rewardPrograms=rows.map(row=>({id:row.id,name:row.name,bank:row.bank||'',cashPerThousand:Number(row.cash_per_thousand)}));saveRewardProgramsLocal();renderRewardPrograms();
}
window.loadRewardPrograms=loadRewardPrograms;

document.getElementById('reward-program-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,existing=rewardPrograms.find(program=>program.id===editingRewardId);
  const program={id:existing?.id||`reward-${crypto.randomUUID?crypto.randomUUID():Date.now()}`,name:form.elements.name.value.trim(),bank:form.elements.bank.value.trim(),cashPerThousand:Number(form.elements.cashPerThousand.value)};
  if(!program.name||!(program.cashPerThousand>0))return;
  if(existing)rewardPrograms=rewardPrograms.map(item=>item.id===existing.id?program:item);else rewardPrograms.push(program);
  saveRewardProgramsLocal();renderRewardPrograms();resetRewardForm();await saveRewardProgram(program);toast(existing?'Tarjeta actualizada.':'Tarjeta agregada. ¡Cabal!');
});
document.getElementById('points-program-select').onchange=renderPointsValue;
document.getElementById('points-balance').oninput=renderPointsValue;
renderRewardPrograms();
if(new URLSearchParams(location.search).has('cashPerThousand'))history.replaceState(null,'',location.pathname+location.hash);

