# Casa en cuenta

App web móvil para apuntar las compras del hogar en Super Selectos, Dollar City y PriceSmart. Calcula subtotal por cantidad, total de la compra, guarda el historial y marca productos que aparecen por primera vez. Montos en USD.

La interfaz usa expresiones salvadoreñas como «quiúbole», «cabal» y «qué chivo», y una ilustración vectorial original inspirada en el mosaico folclórico, los colores y motivos naturales del arte palmeño de Fernando Llort.

## Probar

Abrí `index.html` en el navegador. Para instalarla en el teléfono y usarla sin conexión, primero publicala en un host HTTPS (por ejemplo GitHub Pages). En Android elegí **Instalar** o **Agregar a pantalla de inicio**; en iPhone, en Safari, tocá **Compartir → Añadir a pantalla de inicio**. El guardado local no se comparte automáticamente entre teléfonos.

## Sincronización entre teléfonos

El esquema inicial está en `supabase-schema.sql`. Para habilitar una cuenta compartida hacen falta un proyecto de Supabase, autenticación para los dos usuarios, políticas RLS ligadas al hogar y configurar la URL/clave pública del proyecto. Aún no está conectado; no se debe usar una clave `service_role` en el navegador. El acceso a Supabase y el repositorio de GitHub se configuran al tener sus cuentas/proyecto destino.

## Alcance actual

Registro de compras e historial. No incluye inventario, alertas de existencias ni lectura de tickets/fotos todavía.
