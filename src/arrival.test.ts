import assert from "node:assert/strict";
import test from "node:test";
import moment from "moment-timezone";
import { formatArrivalMessage } from "./arrival";

test("labels realtime and scheduled arrivals and sorts them by time", () => {
  const current = moment.tz("2026-09-29 17:50", "America/Vancouver");
  const message = formatArrivalMessage(
    "28",
    "51671",
    [
      {
        hs: "Boundary/To Phibbs Exchange",
        t: [
          { dt: "18:12", rt: false, dl: 0 },
          { dt: "17:57", rt: true, dl: 15 },
          { dt: "18:27", rt: false, dl: 0 },
        ],
      },
    ],
    current,
  );

  assert.equal(
    message,
    "Bus 28 at stop 51671:\n\n--- Boundary/To Phibbs Exchange ---" +
      "\n🔴 in 7 mins (05:57 PM, 15s late)" +
      "\n🗓️ in 22 mins (06:12 PM)" +
      "\n🗓️ in 37 mins (06:27 PM)",
  );
});

test("moves a 24-hour time to the next day", () => {
  const current = moment.tz("2026-09-29 23:50", "America/Vancouver");
  const message = formatArrivalMessage(
    "28",
    "51671",
    [{ hs: "Boundary/To Kootenay Loop", t: [{ dt: "24:21", rt: false, dl: 0 }] }],
    current,
  );

  assert.match(message, /🗓️ in 31 mins \(12:21 AM\)/);
});

test("formats negative delays as early", () => {
  const current = moment.tz("2026-09-29 17:50", "America/Vancouver");
  const message = formatArrivalMessage(
    "28",
    "51671",
    [{ hs: "Boundary/To Phibbs Exchange", t: [{ dt: "18:12", rt: true, dl: -90 }] }],
    current,
  );

  assert.match(message, /🔴 in 22 mins \(06:12 PM, 2m early\)/);
});

test("reports when no schedules are available", () => {
  assert.equal(
    formatArrivalMessage("28", "51671", []),
    "No schedule times available! Again one more time?",
  );
});