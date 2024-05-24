import axios, { AxiosError } from "axios";
import moment, { Moment } from "moment-timezone";
import { get, sortBy } from "lodash";

export const getBusArrivalTime = async (input: string[]): Promise<string> => {
  if (input.length !== 2) {
    console.log(input);
    return "Wrong input format! Please try again!";
  }

  const current: Moment = moment().tz("America/Vancouver");
  const date: string = current.format("YYYY-MM-DD");

  const busId: string = input[0];
  const stopId: string = input[1];
  const url = `https://getaway.translink.ca/api/gtfs/stop/${stopId}/route/${busId}/realtimeschedules?querySize=6`;

  try {
    const res = await axios({ method: "get", url });
    const data: any[] = get(res, "data[0].r[0].t", []);
    if (data.length === 0) {
      return "No schedule times available! Again one more time?";
    }

    let message = `Bus ${busId} at stop ${stopId}:\n`;
    sortBy(data, ["dt"]).map((entry: any) => {
      const time: string = entry.dt.length === 4 ? `0${entry.dt}` : entry.dt;
      let next: Moment = moment.tz(`${date} ${time}`, "America/Vancouver");
      let diff: number = next.diff(current, "minutes");
      if (diff < -10) {
        next = next.add(1, "days");
        diff = next.diff(current, "minutes");
      }

      if (diff < 0) {
        message += `\n${-diff} mins ago (${next.format("hh:mm A")})`;
      } else if (diff === 0) {
        message += `\nnow (${next.format("hh:mm A")})`;
      } else {
        message += `\nin ${diff} mins (${next.format("hh:mm A")})`;
      }
    });

    return message;
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