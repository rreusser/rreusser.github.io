// Sun position calculator — builds a date/time/timezone control
// that computes sun azimuth and altitude via suncalc.
//
// SunCalc must be imported in the notebook (`import SunCalc from
// 'npm:suncalc'`) and passed in, because local files cannot import
// remote npm modules.

const LABEL_STYLE =
  "width:var(--label-width,120px); flex-shrink:0; padding:5px 0 4px 0;" +
  " margin-right:var(--length2,6.5px);";
const ROW_STYLE =
  "display:flex; align-items:center; font:13px/1.2 var(--sans-serif);" +
  " margin:0; max-width:calc(var(--input-width,240px) + var(--label-width,120px));";

function makeRow(labelText) {
  const row = document.createElement("div");
  row.style.cssText = ROW_STYLE;
  const label = document.createElement("label");
  label.textContent = labelText;
  label.style.cssText = LABEL_STYLE;
  row.appendChild(label);
  return row;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function tzAbbr(date, tz) {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(date)
        .find((p) => p.type === "timeZoneName")?.value || tz
    );
  } catch {
    return tz;
  }
}

function tzOffsetMs(date, tz) {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  return local - utc;
}

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const period = h >= 12 ? "PM" : "AM";
  return `${h12}:${pad2(m)} ${period}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const ZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Paris",
  "Europe/Helsinki",
  "Africa/Cairo",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function createSunCalendar(SunCalc, { getLocation, onChange }) {
  const container = document.createElement("div");

  // ---- Date ----
  const dateRow = makeRow("date");
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = todayISO();
  dateInput.style.cssText =
    "font:inherit; color:inherit; box-sizing:border-box; width:var(--input-width,240px);";
  dateRow.appendChild(dateInput);

  // ---- Time ----
  const timeRow = makeRow("time");
  const timeOutput = document.createElement("output");
  timeOutput.style.cssText =
    "min-width:7em; font-variant-numeric:tabular-nums; text-align:left;";
  const timeSlider = document.createElement("input");
  timeSlider.type = "range";
  timeSlider.min = "0";
  timeSlider.max = "1439";
  timeSlider.step = "1";
  const _now = new Date();
  timeSlider.value = String(_now.getHours() * 60 + _now.getMinutes());
  timeSlider.style.cssText = "flex:1;";
  timeRow.appendChild(timeOutput);
  timeRow.appendChild(timeSlider);

  // ---- Timezone ----
  const tzRow = makeRow("timezone");
  const tzSelect = document.createElement("select");
  tzSelect.style.cssText =
    "font:inherit; color:inherit; box-sizing:border-box; width:var(--input-width,240px);";

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = [...ZONES];
  if (!zones.includes(browserTz)) zones.push(browserTz);

  // Build labels with abbreviation and UTC offset, then sort by offset.
  // When the abbreviation is a generic "GMT+X" form, use the city name instead.
  const labeled = zones.map((tz) => {
    const abbr = tzAbbr(_now, tz);
    const offMs = tzOffsetMs(_now, tz);
    const sign = offMs >= 0 ? "+" : "\u2212";
    const absH = Math.floor(Math.abs(offMs) / 3600000);
    const absM = Math.round((Math.abs(offMs) % 3600000) / 60000);
    const utc = absM > 0 ? `UTC${sign}${absH}:${pad2(absM)}` : `UTC${sign}${absH}`;
    const isGeneric = /^(?:GMT|UTC)[+\-\u2212]?\d/.test(abbr);
    const city = tz.split("/").pop().replace(/_/g, " ");
    const name = isGeneric ? city : abbr;
    return { tz, label: `${name} (${utc})`, offMs };
  });
  labeled.sort((a, b) => a.offMs - b.offMs);

  for (const { tz, label } of labeled) {
    const opt = document.createElement("option");
    opt.value = tz;
    opt.textContent = label;
    if (tz === browserTz) opt.selected = true;
    tzSelect.appendChild(opt);
  }
  tzRow.appendChild(tzSelect);

  container.appendChild(dateRow);
  container.appendChild(timeRow);
  container.appendChild(tzRow);

  // ---- Computation ----
  function getSelectedDate() {
    const minutes = parseInt(timeSlider.value);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const dateStr = dateInput.value;
    if (!dateStr) return null;
    const tz = tzSelect.value;
    // Approximate: treat wall-clock as UTC, then adjust by tz offset
    const approx = new Date(`${dateStr}T${pad2(h)}:${pad2(m)}:00Z`);
    const offset = tzOffsetMs(approx, tz);
    return new Date(approx.getTime() - offset);
  }

  function updateDisplay() {
    const minutes = parseInt(timeSlider.value);
    timeOutput.textContent = formatMinutes(minutes);
  }

  function computeAndNotify() {
    updateDisplay();
    const utcDate = getSelectedDate();
    if (!utcDate) return;

    const [lat, lng] = getLocation();
    const pos = SunCalc.getPosition(utcDate, lat, lng);
    const altDeg = (pos.altitude * 180) / Math.PI;
    // suncalc azimuth: 0 = south, clockwise.
    // notebook azimuth: 0 = east, counterclockwise.
    const scAzDeg = (pos.azimuth * 180) / Math.PI;
    const azDeg = ((270 - scAzDeg) % 360 + 360) % 360;

    if (onChange) {
      onChange({
        az: Math.round(azDeg * 2) / 2,
        alt: Math.round(altDeg * 2) / 2,
      });
    }
  }

  dateInput.addEventListener("input", computeAndNotify);
  timeSlider.addEventListener("input", computeAndNotify);
  tzSelect.addEventListener("change", computeAndNotify);

  // Show initial time but don't fire onChange
  updateDisplay();

  // Expose the currently selected UTC instant. The notebook's
  // time-driven lighting mode reads this every frame to compute solar
  // quantities without re-routing through the onChange callback.
  container.getUtcDate = getSelectedDate;

  return container;
}
