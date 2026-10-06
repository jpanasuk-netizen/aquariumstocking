(function () {
  var table = document.getElementById("spec");
  if (!table) return;
  var headers = table.querySelectorAll("thead th");
  headers.forEach(function (th, index) {
    th.tabIndex = 0;
    th.style.cursor = "pointer";
    function sort() {
      var tbody = table.tBodies[0];
      var rows = Array.prototype.slice.call(tbody.rows);
      var dir = th.getAttribute("aria-sort") === "ascending" ? -1 : 1;
      headers.forEach(function (h) { h.removeAttribute("aria-sort"); });
      th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
      rows.sort(function (a, b) {
        var x = a.cells[index].textContent.trim();
        var y = b.cells[index].textContent.trim();
        var nx = parseFloat(x);
        var ny = parseFloat(y);
        if (!isNaN(nx) && !isNaN(ny) && /^-?\d/.test(x) && /^-?\d/.test(y)) return (nx - ny) * dir;
        return x.localeCompare(y) * dir;
      });
      rows.forEach(function (row) { tbody.appendChild(row); });
    }
    th.addEventListener("click", sort);
    th.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sort(); }
    });
  });
})();
