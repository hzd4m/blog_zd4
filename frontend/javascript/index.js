import "$styles/index.css"
import "$styles/livros.css"
import "$styles/syntax-highlighting.css"

// Import all JavaScript & CSS files from src/_components
import components from "$components/**/*.{js,jsx,js.rb,css}"

console.info("Bridgetown is loaded!")

// Alternância de tema claro/escuro.
// O tema inicial já é definido por um script inline no <head> (sem flash);
// aqui só tratamos o clique no botão e a troca do ícone.
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".tema-toggle")
  if (!btn) return

  const root = document.documentElement
  const icone = btn.querySelector(".tema-icone")

  const sincronizar = () => {
    const escuro = root.getAttribute("data-theme") === "dark"
    if (icone) icone.textContent = escuro ? "☀" : "☾"
    btn.setAttribute("aria-pressed", String(escuro))
  }

  sincronizar()

  btn.addEventListener("click", () => {
    const proximo = root.getAttribute("data-theme") === "dark" ? "light" : "dark"
    root.setAttribute("data-theme", proximo)
    try { localStorage.setItem("tema", proximo) } catch (e) {}
    sincronizar()
  })
})
