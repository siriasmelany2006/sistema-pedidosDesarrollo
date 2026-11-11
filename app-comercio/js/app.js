//--------- VARIABLES ---------
let primeraCarga = true;

//--------- EVENTOS ---------

$(document).ready(function () {
  actualizarBotonPermiso();
  escucharPedidos();
});

$(document).on("click", "#btn-permiso", function () {
  pedirPermiso();
});

$(document).on("click", ".btn-entregar", function () {
  let id = $(this).data("id");
  let cliente = $(this).data("cliente");
  marcarEntregado(id, cliente);
});

//--------- FIRESTORE (TIEMPO REAL) ---------

function escucharPedidos() {
  // onSnapshot se ejecuta una vez al cargar y luego cada vez que
  // se agrega o modifica un pedido, sin recargar la página
  db.collection("pedidos")
    .orderBy("fecha", "desc")
    .onSnapshot(
      function (consulta) {
        let pedidos = [];

        consulta.forEach(function (doc) {
          pedidos.push({ id: doc.id, ...doc.data() });
        });

        mostrarPedidos(pedidos);

        // Notificar solo los pedidos nuevos, no los de la carga inicial
        if (!primeraCarga) {
          consulta.docChanges().forEach(function (cambio) {
            if (cambio.type === "added") {
              let pedido = cambio.doc.data();
              notificar(
                "Nuevo pedido #" + cambio.doc.id.substring(0, 6).toUpperCase(),
                "Cliente: " + pedido.cliente + " - Total: " + formatoColones(pedido.total)
              );
            }
          });
        }

        primeraCarga = false;
      },
      function (error) {
        console.error("Error al escuchar los pedidos:", error);
        $("#listaPedidos").html(
          '<div class="col-12 text-center text-danger">No se pudieron cargar los pedidos</div>'
        );
      }
    );
}

async function marcarEntregado(id, cliente) {
  try {
    await db.collection("pedidos").doc(id).update({
      estado: "entregado",
    });

    let codigo = "#" + id.substring(0, 6).toUpperCase();

    mostrarEntrega(codigo, cliente);
    notificar("Pedido entregado", "El pedido " + codigo + " de " + cliente + " fue marcado como entregado.");
  } catch (error) {
    console.error("Error al marcar como entregado:", error);
    alert("No se pudo actualizar el pedido, intente de nuevo");
  }
}

//--------- VIEWS ---------

function formatoColones(valor) {
  return "₡" + Number(valor).toLocaleString("es-CR");
}

// Evita que el texto escrito por el cliente se interprete como HTML
function escapar(texto) {
  return $("<div>").text(texto).html();
}

function formatoFecha(fecha) {
  // La fecha llega vacía unos instantes mientras el servidor la confirma
  if (!fecha) return "Enviando...";
  return fecha.toDate().toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mostrarPedidos(pedidos) {
  $("#listaPedidos").empty();
  $("#cantidadPedidos").text(pedidos.length);

  if (pedidos.length == 0) {
    $("#listaPedidos").append(`
      <div class="col-12 text-center text-secondary">Aún no hay pedidos registrados</div>
    `);
    return;
  }

  pedidos.forEach(function (p) {
    let entregado = p.estado == "entregado";

    let filas = p.productos
      .map(function (prod) {
        return `
          <tr>
            <td>${escapar(prod.nombre)}</td>
            <td>${prod.cantidad} x ${formatoColones(prod.precio)}</td>
            <td class="text-end">${formatoColones(prod.subtotal)}</td>
          </tr>
        `;
      })
      .join("");

    let boton = entregado
      ? `<button type="button" class="btn btn-success w-100" disabled>Entregado</button>`
      : `<button type="button" class="btn btn-dark w-100 btn-entregar"
            data-id="${p.id}" data-cliente="${escapar(p.cliente)}">
            Marcar como entregado
         </button>`;

    $("#listaPedidos").append(`
      <div class="col-md-6 col-lg-4">
        <div class="card shadow-sm h-100 ${entregado ? "pedido-entregado" : ""}">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <b>#${p.id.substring(0, 6).toUpperCase()}</b>
            <small class="text-secondary">${formatoFecha(p.fecha)}</small>
          </div>
          <div class="card-body">
            <p class="mb-1"><b>Cliente:</b> ${escapar(p.cliente)}</p>
            <p class="mb-3"><b>Dirección:</b> ${escapar(p.direccion)}</p>
            <table class="table table-sm align-middle">
              <tbody>${filas}</tbody>
              <tfoot>
                <tr>
                  <th colspan="2">Total</th>
                  <th class="text-end">${formatoColones(p.total)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="card-footer bg-white">${boton}</div>
        </div>
      </div>
    `);
  });
}

function mostrarEntrega(codigo, cliente) {
  $("#mensajeEntrega").text("El pedido " + codigo + " de " + cliente + " fue marcado como entregado.");
  new bootstrap.Modal("#modalEntrega").show();
}

//--------- NOTIFICACIONES ---------

function actualizarBotonPermiso() {
  if (!("Notification" in window) || Notification.permission === "granted") {
    $("#btn-permiso").hide();
  }
}

async function pedirPermiso() {
  const permiso = await Notification.requestPermission();
  if (permiso === "granted") {
    $("#btn-permiso").hide();
    notificar("Notificaciones activadas", "Recibirás un aviso cuando llegue un pedido nuevo.");
  }
}

async function notificar(titulo, mensaje) {
  try {
    if (Notification.permission !== "granted") return;

    const registro = await navigator.serviceWorker.ready;

    await registro.showNotification(titulo, {
      body: mensaje,
      icon: "icons/icon512_rounded.png",
    });
  } catch (error) {
    console.error("Error al notificar:", error);
  }
}