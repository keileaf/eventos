# Invitaciones digitales: plataforma base

Las páginas viven en **GitHub Pages**, los datos en **Google Sheets** y un script de **Apps Script** funciona como API.

```
backend/Code.gs          → API (se pega en el Apps Script de la hoja de cálculo)
docs/                    → sitio estático (GitHub Pages publica esta carpeta)
  index.html             → portada con las demos
  invitacion.html        → la invitación (?e=EVENTO&i=TOKEN_DEL_INVITADO)
  panel.html             → panel del super usuario y de los organizadores
  fotos/                 → fotos de los eventos (las demo-*.svg son ilustraciones de ejemplo)
  musica/                → canciones .mp3
  js/config.js           → URL de la API y lista de diseños
  themes/<tema>.css/.js  → diseño de cada evento: espacial, heroe, jardin, xv, xv-azul, boda…
```

## Quién puede hacer qué

| Rol | Acceso |
|---|---|
| **Super usuario (admin)** | Ve **todos** los eventos y entra al panel de cualquiera. Crea eventos y organizadores, administra usuarios y archiva eventos. |
| **Organizador (cliente)** | Solo ve **su** evento. Agrega invitados, envía enlaces por WhatsApp, edita textos, fotos y música, y ve quién confirmó. **No puede entrar al panel general.** El servidor lo bloquea, no solo la pantalla. |
| **Invitado** | Abre su enlace único y responde **una sola vez**. |

**Regla de respuesta única:** cuando un invitado confirma o declina, esa invitación queda cerrada. Ni el invitado ni el organizador pueden modificarla. Para cambiarla, el organizador usa **Rehacer invitación**, que elimina la anterior y crea una igual con un enlace nuevo, o la elimina y crea otra a mano. El enlace viejo deja de funcionar.

---

## Paso a paso: hoja de cálculo y Apps Script

### 1. Crear la hoja de cálculo maestra
1. Entra a <https://sheets.google.com> con la cuenta que será la dueña de todo y crea una **hoja en blanco**.
2. Ponle un nombre, por ejemplo **Invitaciones – Base de datos**.

### 2. Pegar el código
1. En la hoja, ve a **Extensiones → Apps Script**. Se abre el editor.
2. Borra todo lo que trae `Código.gs` y pega el contenido completo de `backend/Code.gs`.
3. Arriba del archivo cambia la contraseña inicial:
   ```js
   const ADMIN_USER = 'admin';
   const ADMIN_PASS = 'UnaContraseñaSegura';
   ```
4. Guarda con el ícono de disco o `Ctrl + S`. Puedes nombrar el proyecto **Invitaciones API**.

### 3. Ejecutar `setup` una sola vez
1. En la barra de arriba elige la función **`setup`** y presiona **Ejecutar**.
2. Google pedirá permisos: **Revisar permisos → elige tu cuenta**.
3. Si aparece "Google no verificó esta app", entra a **Configuración avanzada → Ir a Invitaciones API (no seguro) → Permitir**. Es tu propio script, así que es normal.
4. Regresa a la hoja de cálculo. Ahora tiene las pestañas **Usuarios** y **Eventos**, y tu usuario admin.

### 4. Publicar como aplicación web
1. En Apps Script, ve a **Implementar → Nueva implementación**.
2. En el engrane de "Seleccionar tipo", elige **Aplicación web**.
3. Llena así:
   - Descripción: `v1`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**. Es necesario para que los invitados confirmen sin cuenta de Google.
4. Presiona **Implementar** y copia la **URL de la aplicación web**, la que termina en `/exec`.

> **Cada vez que modifiques `Code.gs`:** ve a **Implementar → Gestionar implementaciones → ✏️ Editar → Versión: Nueva versión → Implementar**. Así la URL no cambia. Si en vez de eso creas otra "Nueva implementación", la URL cambia.

### 5. Subir el sitio a GitHub
1. Crea un repositorio en GitHub, por ejemplo `invitaciones`.
2. Sube todo el proyecto (**Add file → Upload files**) o usa git.
3. En `docs/js/config.js` pega tu URL:
   ```js
   API_URL: 'https://script.google.com/macros/s/XXXX/exec',
   ```
4. Ve a **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / carpeta `/docs` → Save**.
5. En 1 o 2 minutos tu sitio estará en `https://TU-USUARIO.github.io/invitaciones/`.

### 6. Primer uso
1. Abre `…/panel.html`, entra como `admin` y **cambia tu contraseña** en *Cuenta*.
2. En **Nuevo evento**: escribe el nombre, el tipo y el diseño, la fecha y **crea el usuario del organizador**. En la hoja aparece una pestaña nueva `EV_<id>` para ese evento.
3. Pásale al organizador la dirección del panel con su usuario y contraseña. Desde ahí agrega a sus invitados y los envía.

### 7. Fotos, croquis y música
- **Recomendado:** sube las imágenes a `docs/fotos/` y los `.mp3` a `docs/musica/` en el repositorio. En el panel escribe la ruta, por ejemplo `fotos/sofia-portada.jpg` o `musica/vals.mp3`.
- **Con Google Drive:** comparte el archivo como *Cualquier persona con el enlace* y pega el enlace. Funciona bien para fotos. Para música es menos confiable, mejor usa GitHub.
- Usa fotos de **máximo 1600 px** de ancho (JPG, calidad 80) para que carguen rápido en el celular.
- En *Música* puedes escribir `cajita` para usar la caja musical incluida, que no necesita archivo.
- Música de boda libre: el diseño de boda trae por defecto *Canon in D Major* (Pachelbel), en la versión de Kevin MacLeod (incompetech.com), con licencia **CC BY 3.0**. Se puede usar gratis siempre que aparezca el crédito, y la invitación lo muestra al pie. Para que no dependa de otro sitio, descarga el .mp3 desde incompetech.com, súbelo a `docs/musica/` y escribe esa ruta en el panel.
- **Nuestra historia** (bodas): en el panel escribe una línea por momento, `fecha | título | texto | foto`.
- La música empieza cuando el invitado toca **Abrir invitación**, porque los celulares no permiten reproducir audio sin un toque. Hay un botón flotante para pausarla.

### Qué guarda cada pestaña
| Pestaña | Columnas |
|---|---|
| `Usuarios` | usuario · hash · salt · rol · nombre · creado |
| `Eventos` | id · propietario · tema · config (JSON) · activo · creado · actualizado |
| `EV_<id>` | token · nombre · personas · lugares · telefono · estado · confirmados · detalle · mensaje · respondido · enviado · creado |

Puedes **leer** las pestañas directamente, por ejemplo para filtrar o imprimir la lista. Para **cambiar** datos usa el panel, porque ahí se respetan las reglas.

---

## Modo demo (ejemplos para mostrar a clientes)

Agrega `?demo=1` a la dirección y el sitio usa datos de ejemplo guardados solo en el navegador. Así **no toca tu hoja de cálculo**:

- Ejemplos: `https://TU-USUARIO.github.io/REPO/?demo=1`
- Panel de prueba: `…/panel.html?demo=1`
- Cuenta de ejemplo para clientes: `novios.ar / boda123` (organizador). La del super usuario de ejemplo no se publica.

Los enlaces de invitación que se copian en modo demo llevan `?demo=1` y se pueden compartir. Cada persona ve su propia copia de los datos de ejemplo. Si `API_URL` está vacío, el sitio entero funciona en modo demo.

## Nota sobre personajes con derechos

Los diseños no usan personajes de marcas (superhéroes, princesas de películas, etc.) ni sus imágenes. Están protegidos y una invitación publicada en internet podría recibir reclamos. Para fans de un personaje se usa un diseño inspirado en el género, como `heroe`, donde el festejado es el héroe.

## Demos de la portada

En el panel del super usuario, en la pestaña *Eventos*, la sección **"Demos en la página principal"** tiene un interruptor por demo y se guarda al instante. La lista de demos está en `DEMOS`, dentro de `docs/js/config.js`. La selección se guarda en las *Propiedades del script* de Apps Script, así que requiere el `Code.gs` actualizado y una **nueva versión** de la implementación.

## QR de fotos

Los invitados escanean un QR, suben sus fotos desde el celular y todos las ven en la galería del evento (`fotos.html?e=ID`).
- Se activa por evento: en el panel, en la tarjeta **"QR de fotos"**, o en *Extras premium*.
- La invitación muestra la sección **"Comparte tus fotos"** con su QR y un botón.
- En el panel están **Abrir galería**, **Copiar enlace**, **Tarjeta QR para imprimir** (para las mesas) y la opción de **quitar fotos** que no deban estar.
- Las fotos se reducen en el celular antes de subirse y se guardan en Google Drive, en la carpeta *"Invitaciones · Fotos de invitados"*, con una subcarpeta por evento.

**Importante:** esta función usa Google Drive. Después de pegar el nuevo `Code.gs`, **ejecuta `setup` otra vez** para aceptar el permiso de Drive y publica una **nueva versión** de la implementación.

## Mesas y acomodo

En el panel de cada evento, la sección **"Mesas y acomodo"** tiene un interruptor que activa o apaga la función. Al apagarla, el acomodo se conserva.
- Crea varias mesas a la vez (por ejemplo, *5 mesas de 8 sillas*) o agrega una mesa suelta con el número de sillas que quieras.
- Cada silla se numera sola o se le puede poner nombre ("Novia", "A1"…).
- Toca una silla para asignar a una persona, moverla de otra mesa, escribir otro nombre, vaciarla o eliminarla.
- Por mesa se puede cambiar el nombre, agregar o quitar sillas, vaciarla o eliminarla.
- Se ven las personas sin lugar. Las que confirmaron aparecen en verde.
- La mesa se escribe sola en cada invitado y aparece en su **pase con QR**.
- El acomodo no aparece en la invitación pública: solo lo ven el organizador y el super usuario.

Requiere el `Code.gs` actualizado (columna `mesas` en la hoja *Eventos*, que se agrega sola) y una **nueva versión** de la implementación.

## Funciones premium (cualquier diseño)

Se activan desde el panel, en *Editar datos de la invitación*:
- **Pase de acceso con QR**: aparece en cuanto el invitado confirma. El QR se genera dentro del sitio (`js/qr.js`), sin depender de otros servicios.
- **Paleta de vestimenta** y **color reservado** para la festejada.
- **Mesa de regalos** (tienda, número y enlace) y **lluvia de sobres** con CLABE y botón para copiarla.
- **Hashtag** y enlace a un **álbum compartido** para que los invitados suban sus fotos.
- **Fotos a lo ancho entre secciones** con frase y efecto parallax (hasta 3).
- Íconos automáticos en el itinerario (misa, recepción, vals, cena, pastel, baile…).
- **Preguntas al confirmar**: alergias o restricciones alimentarias y canción que no puede faltar. El organizador las ve en cada invitado, en las estadísticas y en el CSV.
- **Mesa asignada**: se captura por invitado en el panel y aparece en su pase.
- **Hospedaje** recomendado y **preguntas frecuentes** desplegables.
- **Varios eventos** (ceremonia, recepción, tornaboda…), cada uno con su mapa.

> Esta versión agregó las columnas `mesa` y `extras` a las hojas de invitados. Después de pegar el nuevo `Code.gs`, publica una **nueva versión** (Implementar → Gestionar implementaciones → Editar → Nueva versión). Las hojas de eventos existentes se actualizan solas la próxima vez que se usan.

## Agregar un diseño nuevo

1. Copia `themes/xv.css` y `themes/xv.js` con otro nombre, por ejemplo `boda-olivo`. Si el diseño necesita una portada completamente distinta, como `xv-azul`, usa `fullHero: true` y arma la portada en `hero()`.
2. Cambia los colores (variables `--accent`, `--font-name`…), las ilustraciones y las animaciones.
3. Agrégalo a `TEMAS` en `config.js`. Ya aparece en el panel.

Las secciones (portada, cuenta regresiva, padres y padrinos, lugares con mapa y croquis, itinerario, galería, vestimenta, confirmación y música) son comunes a todos los diseños. Cada sección aparece solo si el evento tiene esos datos.

## Notas técnicas
- La invitación se adapta a celulares pequeños (320 px), tabletas y computadoras.
- La sesión dura 6 horas. Las escrituras usan `LockService`, así que dos confirmaciones al mismo tiempo no se pisan.
- Archivar un evento no borra su pestaña `EV_…`.
- Una hoja de cálculo aguanta cómodamente cientos de eventos. Si crecieras mucho más, el cambio sería usar un archivo por evento, modificando solo `guestSheet_()`.
