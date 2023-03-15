import axios, { AxiosError } from "axios";
import { get, isEmpty, sortBy } from "lodash";
import { Markup } from "telegraf";
import { Location } from "telegraf/typings/core/types/typegram";

export const getBusArrivalTime = async (input: string[]): Promise<string> => {
  if (input.length !== 2) {
    console.log(input);
    return "Wrong input format! Please try again!";
  }

  const busId: string = input[0];
  const stopId: string = input[1];
  const url: string = `https://api.translink.ca/rttiapi/v1/stops/${stopId}/estimates?apikey=${process.env.TRANSLINK_API_KEY}&routeNo=${busId}`;
  try {
    const res: any = await axios({ method: "get", url });
    const schedules: any[] = get(get(res.data, 0), "Schedules", []);
    if (schedules.length === 0) {
      return "No schedule times available! Again one more time?";
    }

    let message: string = `Bus ${busId} at stop ${stopId}:\n`;
    schedules.forEach((schedule: any) => {
      const countdown: number = schedule["ExpectedCountdown"];
      if (countdown == 0) {
        message += `\nnow (${schedule["ExpectedLeaveTime"]})`;
      } else if (countdown < 0) {
        message += `\n${Math.abs(countdown)} mins ago (${
          schedule["ExpectedLeaveTime"]
        })`;
      } else {
        message += `\nin ${countdown} mins (${schedule["ExpectedLeaveTime"]})`;
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

export interface NearbyResponse {
  message: string;
  options: { text: string; hide?: boolean }[];
}

export const getNearby = async (
  location: Location.CommonLocation
): Promise<NearbyResponse> => {
  const url: string = `https://api.translink.ca/rttiapi/v1/stops?apikey=${process.env.TRANSLINK_API_KEY}&lat=${location.latitude}&long=${location.longitude}&radius=500`;
  try {
    const res = await axios({ method: "get", url });
    const data: any[] = res.data || [];
    const opts: any[] = [];
    data.forEach((daton) => {
      const routes: string = get(daton, "Routes");
      if (!isEmpty(routes)) {
        const stopId: number = get(daton, "StopNo");
        const busIdList: string[] = routes.split(",");
        busIdList.forEach((busId: string) => {
          opts.push(Markup.button.text(`${busId.trim()} ${stopId}`));
        });
      }
    });

    const message =
      opts.length === 0
        ? "No neaby bus stop or schedule found!"
        : "Please select one of the provided options";

    return { message, options: sortBy(opts, "text") };
  } catch (error) {
    console.log(error);
    let message = "Something unexpectedly happened :(";
    if (axios.isAxiosError(error)) {
      const axiosError: AxiosError = error as AxiosError;
      message = get(axiosError.response?.data, "Message", message);
    }

    return { message: message, options: [] };
  }
};
