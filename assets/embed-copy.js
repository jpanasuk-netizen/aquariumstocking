document.getElementById("copy").addEventListener("click", function () {
  var text = document.getElementById("snippet").value;
  var note = document.getElementById("copied");
  function done() { note.textContent = "Copied."; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { note.textContent = "Select the box and copy it."; });
  } else {
    note.textContent = "Select the box and copy it.";
  }
});
