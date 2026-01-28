const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc/values/Receitas Sabor de Casa?key=AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc`;

let receitas = [];
let pagina = 0;
const porPagina = 10;
let categoriaAtiva = "Todas";

fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    const linhas = data.values;
    linhas.shift();

    receitas = linhas.map(l => ({
      nome: l[0],
      categoria: l[1],
      tempo: l[2],
      ingrediente: l[3],
      modo: l[4],
      url: l[5],
      mensagem: l[6]
    }));

    carregarCategorias();
    carregarMais();
  });

function carregarCategorias() {
  const cats = ["Todas", ...new Set(receitas.map(r => r.categoria))];
  const nav = document.getElementById("categorias");

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.onclick = () => {
      categoriaAtiva = cat;
      pagina = 0;
      document.getElementById("lista-receitas").innerHTML = "";
      carregarMais();
    };
    nav.appendChild(btn);
  });
}

function carregarMais() {
  const lista = document.getElementById("lista-receitas");

  const filtradas = receitas.filter(r =>
    categoriaAtiva === "Todas" || r.categoria === categoriaAtiva
  );

  const inicio = pagina * porPagina;
  const fim = inicio + porPagina;

  filtradas.slice(inicio, fim).forEach(r => {
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => {
      localStorage.setItem("receita", JSON.stringify(r));
      window.location.href = "receita.html";
    };

    card.innerHTML = `
      <h3>${r.nome}</h3>
      <span>${r.categoria} • ${r.tempo}</span>
    `;

    lista.appendChild(card);
  });

  pagina++;
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    carregarMais();
  }
});

document.getElementById("search").addEventListener("input", e => {
  const termo = e.target.value.toLowerCase();
  pagina = 0;
  document.getElementById("lista-receitas").innerHTML = "";

  receitas = receitas.filter(r =>
    r.nome.toLowerCase().includes(termo)
  );

  carregarMais();
});
