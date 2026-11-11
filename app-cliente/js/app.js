//--------- VARIABLES ---------
let productos = [];
let pedido = [];

//--------- EVENTOS ---------

$(document).ready(function () {
  cargarProductos();
  actualizarBotonPermiso();
});

$(document).on("click", "#btn-permiso", function () {
  pedirPermiso();
});

$(document).on("click", "#btn-agregar", function () {
  agregarProducto();
});

$(document).on("click", ".btn-quitar", function () {
  let id = $(this).data("id");
  quitarProducto(id);
});

$(document).on("submit", "#formPedido", function (event) {
  event.preventDefault();
  enviarPedido();
});

//--------- FIRESTORE ---------

async function cargarProductos() {
  try {
    const consulta = await db.collection("productos").orderBy("nombre").get();

    productos = [];
    consulta.forEach(function (doc) {
      productos.push({ id: doc.id, ...doc.data() });
    });

    mostrarProductos();
  } catch (error) {
    console.error("Error al cargar productos:", error);
    $("#producto").html('<option value="">No se pudieron cargar los productos</option>');
  }
}

async function guardarPedido(datos) {
  const referencia = await db.collection("pedidos").add({
    cliente: datos.cliente,
    direccion: datos.direccion,
    productos: datos.productos,
    total: datos.total,
    estado: "pendiente",
    fecha: firebase.firestore.FieldValue.serverTimestamp(),
  });

  return referencia.id;
}

//--------- LÓGICA DEL PEDIDO ---------

function agregarProducto() {
  let id = $("#producto").val();
  let cantidad = Number($("#cantidad").val());

  if (id == "" || cantidad < 1) {
    alert("Seleccione un producto e indique una cantidad válida");
    return;
  }

  let producto = productos.find(function (p) {
    return p.id == id;
  });

  // Si el producto ya está en el pedido, se suma la cantidad
  let existente = pedido.find(function (p) {
    return p.id == id;
  });

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    pedido.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad,
    });
  }

  $("#cantidad").val(1);
  mostrarPedido();
}

function quitarProducto(id) {
  pedido = pedido.filter(function (p) {
    return p.id != id;
  });
  mostrarPedido();
}

function calcularTotal() {
  return pedido.reduce(function (total, p) {
    return total + p.precio * p.cantidad;
  }, 0);
}

async function enviarPedido() {
  if (pedido.length == 0) {
    alert("Agregue al menos un producto al pedido");
    return;
  }

  let datos = {
    cliente: $("#nombre").val().trim(),
    direccion: $("#direccion").val().trim(),
    productos: pedido.map(function (p) {
      return {
        nombre: p.nombre,
        precio: p.precio,
        cantidad: p.cantidad,
        subtotal: p.precio * p.cantidad,
      };
    }),
    total: calcularTotal(),
  };

  $("#btn-enviar").prop("disabled", true).text("Enviando...");

  try {
    let id = await guardarPedido(datos);

    mostrarConfirmacion(id, datos.cliente);
    notificar("Pedido enviado", "Gracias " + datos.cliente + ", tu pedido fue registrado correctamente.");
    limpiarPedido();
  } catch (error) {
    console.error("Error al enviar el pedido:", error);
    alert("No se pudo enviar el pedido, intente de nuevo");
  }

  $("#btn-enviar").prop("disabled", false).text("Enviar pedido");
}

//--------- VIEWS ---------

function formatoColones(valor) {
  return "₡" + valor.toLocaleString("es-CR");
}

function mostrarProductos() {
  $("#producto").empty();
  $("#producto").append('<option value="">Seleccione un producto</option>');

  productos.forEach(function (p) {
    $("#producto").append(`
      <option value="${p.id}">${p.nombre} - ${formatoColones(p.precio)}</option>
    `);
  });
}

function mostrarPedido() {
  $("#tablaPedido").empty();

  if (pedido.length == 0) {
    $("#tablaPedido").append(`
      <tr>
        <td colspan="4" class="text-center text-secondary">Aún no hay productos agregados</td>
      </tr>
    `);
  }

  pedido.forEach(function (p) {
    $("#tablaPedido").append(`
      <tr>
        <td>${p.nombre}</td>
        <td>${p.cantidad} x ${formatoColones(p.precio)}</td>
        <td>${formatoColones(p.precio * p.cantidad)}</td>
        <td>
          <button type="button" class="btn btn-sm btn-danger btn-quitar" data-id="${p.id}">
            Eliminar
          </button>
        </td>
      </tr>
    `);
  });

  $("#totalPedido").text(formatoColones(calcularTotal()));
}

function limpiarPedido() {
  pedido = [];
  $("#formPedido")[0].reset();
  $("#cantidad").val(1);
  $("#producto").val("");
  mostrarPedido();
}

function mostrarConfirmacion(id, cliente) {
  $("#mensajeConfirmacion").text(
    "Gracias " + cliente + ", tu pedido #" + id.substring(0, 6).toUpperCase() + " fue registrado correctamente."
  );
  new bootstrap.Modal("#modalConfirmacion").show();
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
    notificar("Notificaciones activadas", "Ya puedes recibir avisos de tu pedido.");
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