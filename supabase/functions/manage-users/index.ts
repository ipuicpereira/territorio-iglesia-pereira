// Deploy with JWT verification disabled at the gateway: this function verifies
// the bearer token with Supabase Auth before checking the caller's admin role.
const cors={'Access-Control-Allow-Origin':'https://territorio-iglesia-pereira.necheverry.chatgpt.site','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
Deno.serve(async(request:Request)=>{
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return reply(405,{error:'Método no permitido'});
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Inicia sesión nuevamente.'});
 try{
 const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:authorization}});if(!auth.ok)return reply(401,{error:'Sesión inválida'});const caller=await auth.json();
 const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 const profileResponse=await fetch(`${url}/rest/v1/perfiles?id=eq.${caller.id}&select=rol,bloqueado`,{headers});if(!profileResponse.ok)throw new Error('No se pudieron verificar los permisos.');const profiles=await profileResponse.json();if(profiles[0]?.rol!=='admin'||profiles[0]?.bloqueado)return reply(403,{error:'Solo un administrador puede gestionar cuentas.'});
 const body=await request.json();
 if(body.action==='create'){
 const username=String(body.username??'').trim().toLowerCase(),password=String(body.password??''),name=String(body.name??'').trim();
 if(!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<10||password.length>100||!name||name.length>150)return reply(400,{error:'Revisa el usuario, nombre y contraseña (mínimo 10 caracteres).'});
 const created=await fetch(`${url}/auth/v1/admin/users`,{method:'POST',headers,body:JSON.stringify({email:`${username}@usuarios.casaoracion.local`,password,email_confirm:true,user_metadata:{nombre_completo:name}})});
 if(!created.ok)return reply(400,{error:'No se pudo crear la cuenta. El usuario puede existir o la contraseña no cumple los requisitos.'});return reply(200,{ok:true});
 }
 if(body.action==='block'){
 if(!/^[0-9a-f-]{36}$/i.test(body.id)||typeof body.blocked!=='boolean'||body.id===caller.id)return reply(400,{error:'No puedes bloquear tu propia cuenta.'});
 const target=await fetch(`${url}/rest/v1/perfiles?id=eq.${body.id}&select=id`,{headers});if(!target.ok||(await target.json()).length!==1)return reply(404,{error:'Usuario no encontrado.'});
 // RLS blocking takes effect even for access tokens already issued.
 const changed=await fetch(`${url}/rest/v1/perfiles?id=eq.${body.id}`,{method:'PATCH',headers,body:JSON.stringify({bloqueado:body.blocked})});if(!changed.ok)throw new Error('No se pudo cambiar el acceso.');
 const banned=await fetch(`${url}/auth/v1/admin/users/${body.id}`,{method:'PUT',headers,body:JSON.stringify({ban_duration:body.blocked?'876000h':'none'})});if(!banned.ok)return reply(500,{error:'El permiso de datos cambió; reintenta para completar el cambio de inicio de sesión.'});
 return reply(200,{ok:true});
 }
 return reply(400,{error:'Acción no válida'});
 }catch{return reply(500,{error:'No se pudo completar la operación. Intenta nuevamente.'})}
});
