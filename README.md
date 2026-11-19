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
  themes/<tema>.css/.js  → diseño de cada evento: espacial, jardin, xv…
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
- La música empieza cuando el invitado toca **Abrir invitación**, porque los celulares no permiten reproducir audio sin un toque. Hay un botón flotante para pausarla.

### Qué guarda cada pestaña
| Pestaña | Columnas |
|---|---|
| `Usuarios` | usuario · hash · salt · rol · nombre · creado |
| `Eventos` | id · propietario · tema · config (JSON) · activo · creado · actualizado |
| `EV_<id>` | token · nombre · personas · lugares · telefono · estado · confirmados · detalle · mensaje · respondido · enviado · creado |

Puedes **leer** las pestañas directamente, por ejemplo para filtrar o imprimir la lista. Para **cambiar** datos usa el panel, porque ahí se respetan las reglas.

---

## Probar sin instalar nada (modo demo)

Si `API_URL` está vacío, todo funciona en el navegador con datos de ejemplo:
`admin / admin123` · `familia.mateo / mateo123` · `familia.vale / vale123` · `familia.sofia / sofia123`

## Agregar un diseño nuevo

1. Copia `themes/xv.css` y `themes/xv.js` con otro nombre, por ejemplo `boda-olivo`.
2. Cambia los colores (variables `--accent`, `--font-name`…), las ilustraciones y las animaciones.
3. Agrégalo a `TEMAS` en `config.js`. Ya aparece en el panel.

Las secciones (portada, cuenta regresiva, padres y padrinos, lugares con mapa y croquis, itinerario, galería, vestimenta, confirmación y música) son comunes a todos los diseños. Cada sección aparece solo si el evento tiene esos datos.

## Notas técnicas
- La invitación se adapta a celulares pequeños (320 px), tabletas y computadoras.
- La sesión dura 6 horas. Las escrituras usan `LockService`, así que dos confirmaciones al mismo tiempo no se pisan.
- Archivar un evento no borra su pestaña `EV_…`.
- Una hoja de cálculo aguanta cómodamente cientos de eventos. Si crecieras mucho más, el cambio sería usar un archivo por evento, modificando solo `guestSheet_()`.
