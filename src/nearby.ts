import axios, { AxiosError } from "axios";
import haversine from "haversine-distance";
import { get, sortBy } from "lodash";
import moment, { Moment } from "moment-timezone";
import { Location } from "telegraf/typings/core/types/typegram";

export interface NearbyResponse {
  message: string;
  options: { text: string; hide?: boolean }[];
}

export const getNearby = async (
  location: Location.CommonLocation,
): Promise<NearbyResponse> => {
  const url: string =
    "https://getaway.translink.ca/api/gtfs/stops/49.47671,-123.43833/49,-122.30006";
  try {
    const res = await axios({ method: "get", url });
    const stops: any[] = get(res, "data", []);

    const nearbyStops = stops
      .map((stop: any) => {
        const dist: number = haversine(
          { latitude: stop.la, longitude: stop.lo },
          { latitude: location.latitude, longitude: location.longitude },
        );
        return { ...stop, dist };
      })
      .filter((stop: any) => stop.dist < 500)
      .sort((a: any, b: any) => a.dist - b.dist);

    const current: Moment = moment().tz("America/Vancouver");
    const date: string = current.format("YYYY-MM-DD");
    const stopsAndBusIds = (
      await Promise.all(
        nearbyStops.map((stop: any) => {
          return axios({
            method: "get",
            url: `https://getaway.translink.ca/api/gtfs/stop/${stop.sc}/schedules/${date}`,
          });
        }),
      )
    ).map((res: any) => get(res, "data[0]", []));

    const opts: any[] = [];
    stopsAndBusIds.forEach((stop: any) => {
      stop.r.forEach((route: any) => {
        opts.push({
          text: `${route.rs.trim()} ${stop.sc.trim()}`,
          hide: false,
        });
      });
    });

    const message =
      opts.length === 0
        ? "No nearby bus stop or schedule found!"
        : "Please select one of the provided options";

    return {
      message,
      options: sortBy(opts, ["text"]),
    };
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
