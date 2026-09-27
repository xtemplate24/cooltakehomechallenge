const form = document.getElementById("convert-form");
const resultEl = document.getElementById("result");
const customRateToggle = document.getElementById("use-custom-rate");
const customRateInput = document.getElementById("custom-rate");
const fromSelect = document.getElementById("from");
const toSelect = document.getElementById("to");
const swapBtn = document.getElementById("swap");

customRateToggle.addEventListener("change", () => {
  customRateInput.disabled = !customRateToggle.checked;
  if (!customRateToggle.checked) {
    customRateInput.value = "";
  } else {
    customRateInput.focus();
  }
});

swapBtn.addEventListener("click", () => {
  const tmp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = tmp;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultEl.textContent = "Converting…";
  resultEl.classList.remove("error");

  const amount = document.getElementById("amount").value;
  const from = fromSelect.value;
  const to = toSelect.value;
  const customRate = customRateToggle.checked ? customRateInput.value : undefined;

  try {
    const res = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, from, to, customRate }),
    });

    const data = await res.json();

    if (!res.ok) {
      resultEl.textContent = data.error || "Something went wrong";
      resultEl.classList.add("error");
      return;
    }

    const rateNote = data.source === "custom" ? " (custom rate)" : "";
    resultEl.textContent = `${data.amount} ${data.from} = ${data.result.toFixed(
      4
    )} ${data.to} — rate ${data.rate.toFixed(6)}${rateNote}`;
  } catch (err) {
    resultEl.textContent = "Network error — is the backend reachable?";
    resultEl.classList.add("error");
  }
});
