# Casa en cuenta

App web móvil para apuntar las compras del hogar en Super Selectos, Dollar City, PriceSmart y otros lugares que ustedes agreguen. Calcula subtotales, total de la compra, guarda el historial y marca productos que aparecen por primera vez. Montos en USD.

La interfaz usa expresiones salvadoreñas como «quiúbole», «cabal» y «qué chivo», con una ilustración vectorial original inspirada en el mosaico folclórico y los motivos naturales del arte palmeño de Fernando Llort.

## Probar en modo local

Abrí `index.html` en el navegador. Sin proyecto configurado, compras y tiendas se guardan solo en ese dispositivo.

## Instalar en el teléfono

Publicá la app en HTTPS (GitHub Pages). En Android elegí **Instalar** o **Agregar a pantalla de inicio**; en iPhone, en Safari, tocá **Compartir → Añadir a pantalla de inicio**.

## Sincronizar dos cuentas

1. Creá un proyecto Supabase dedicado a esta app.
2. En **SQL Editor**, ejecutá todo `supabase-schema.sql`. Activa RLS; las compras y tiendas solo son visibles para miembros del mismo hogar.
3. Ejecutá también `supabase-reward-programs-schema.sql` para compartir las tarjetas y sus equivalencias de puntos entre las dos cuentas.
4. En **Authentication → Sign In / Providers**, habilitá correo y contraseña. Desactivá la confirmación de correo para que puedan crear cuenta sin configurar SMTP.
5. En **Authentication → URL Configuration**, agregá `https://diplo19.github.io/casa-en-cuenta/` a las URLs permitidas.
6. En **Project Settings → API Keys**, copiá la URL y la clave pública `publishable` (o `anon`) en `supabase-config.js`. Nunca pongás una clave `secret` ni `service_role` en el navegador.
7. Publicá los cambios en GitHub Pages. Cada persona crea su cuenta con nombre, correo y clave; una crea el hogar y comparte el código con la otra.

Para que **Olvidé mi contraseña** pueda enviar enlaces a cualquier correo, Supabase requiere configurar un servidor SMTP. El servidor gratuito de prueba solo entrega correos a miembros del equipo del proyecto. No agregués a tu prometida como miembro del equipo: el código del hogar le da el acceso limitado que necesita.

## Tiendas

La pestaña **Tiendas** permite agregar un lugar con nombre y emoji, o quitarlo de la lista activa. Las tiendas se archivan para conservar las etiquetas de compras anteriores. Con el hogar conectado, los cambios se comparten entre ambas cuentas.

## Puntos de tarjetas

En **Ajustes → Tarjetas y puntos** agregá el nombre de cada tarjeta y los dólares que el banco entrega por 1,000 puntos. En **Plan → ¿Cuánto valen tus puntos?** consultá o actualizá el saldo; la app guarda la fecha del último cambio y comparte ambos datos con el hogar. Confirmá el valor de canje en la app o reglamento de tu banco; puede variar por tarjeta y forma de canje.

## Alcance

Registro e historial de compras. No incluye inventario, alertas de existencias ni lectura de tickets/fotos.

