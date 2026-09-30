import axios, { AxiosError } from "axios";
import moment, { Moment } from "moment-timezone";
import { get, sortBy } from "lodash";

const formatDelay = (delay: number): string => {
  if (!Number.isFinite(delay) || delay === 0) {
    return "";
  }

  const absoluteDelay: number = Math.abs(delay);
  const value: number =
    absoluteDelay < 60 ? absoluteDelay : Math.round(absoluteDelay / 60);
  const unit: string = absoluteDelay < 60 ? "s" : "m";

  return delay > 0
    ? `${value}${unit} late`
    : `${value}${unit} early`;
};

export const formatArrivalMessage = (
  busId: string,
  stopId: string,
  data: any[],
  current: Moment = moment().tz("America/Vancouver"),
): string => {
  if (data.length === 0) {
    return "No schedule times available! Again one more time?";
  }

  const date: string = current.format("YYYY-MM-DD");
  let message = `Bus ${busId} at stop ${stopId}:`;
  data.forEach((entry: any) => {
    message += `\n\n--- ${entry.hs} ---`;
    const arrivals = get(entry, "t", []).map((arrival: any) => {
      const hour: number = parseInt(arrival.dt.substring(0, 2));
      let time: string = arrival.dt;
      if (hour >= 24) {
        time = `${hour - 24}${arrival.dt.substring(2)}`;
      }
      return {
        time: time.length === 4 ? `0${time}` : time,
        realtime: arrival.rt === true,
        delay: Number(arrival.dl) || 0,
      };
    });

    const arrivalDiffs = arrivals.map(
      ({
        time,
        realtime,
        delay,
      }: {
        time: string;
        realtime: boolean;
        delay: number;
      }) => {
        let next: Moment = moment.tz(`${date} ${time}`, "America/Vancouver");
        let diff: number = next.diff(current, "minutes");
        if (diff < -10) {
          next = next.add(1, "days");
          diff = next.diff(current, "minutes");
        }

        return { next: next, diff: diff, realtime: realtime, delay: delay };
      },
    );

    sortBy(arrivalDiffs, ["diff"]).forEach(
      ({
        next,
        diff,
        realtime,
        delay,
      }: {
        next: Moment;
        diff: number;
        realtime: boolean;
        delay: number;
      }) => {
        const icon = realtime ? "🔴" : "🗓️";
        const delayText: string = formatDelay(delay);
        const suffix: string = delayText ? `, ${delayText}` : "";
        if (diff < 0) {
          message += `\n${icon} ${-diff} mins ago (${next.format("hh:mm A")}${suffix})`;
        } else if (diff === 0) {
          message += `\n${icon} now (${next.format("hh:mm A")}${suffix})`;
        } else {
          message += `\n${icon} in ${diff} mins (${next.format("hh:mm A")}${suffix})`;
        }
      },
    );
  });

  return message;
};

export const getBusArrivalTime = async (input: string[]): Promise<string> => {
  if (input.length !== 2) {
    console.log(input);
    return "Wrong input format! Please try again!";
  }

  const busId: string = input[0];
  const stopId: string = input[1];
  const url = `https://getaway.translink.ca/api/gtfs/stop/${stopId}/route/${busId}/realtimeschedules?querySize=6`;

  try {
    const res = await axios({ method: "get", url });
    const stop = Array.isArray(res.data)
      ? res.data[0]
      : res.data?.["0"] ?? Object.values(res.data ?? {})[0];
    const data: any[] = get(stop, "r", []);
    return formatArrivalMessage(busId, stopId, data);
  } catch (error) {
    console.log(error);
    let message = "Something unexpectedly happened :(";
    if (axios.isAxiosError(error)) {
      const axiosError: AxiosError = error as AxiosError;
      message = get(axiosError.response?.data, "Message", message);
    }
    return message;
  }
};
