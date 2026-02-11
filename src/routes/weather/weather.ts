import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { parse } from "json2csv";
import WeatherDataModel from "../../models/weatherData";
const router = express.Router();

const getCacheFilePath = (selectedValue: string): string => {
  return path.join(__dirname, `weather_cache_${selectedValue}.csv`);
};

const readCSV = async (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    if (fs.existsSync(filePath)) {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", (err) => reject(err));
    } else {
      resolve([]);
    }
  });
};

const writeCSV = (filePath: string, data: any[]): void => {
  const csvData = parse(data);
  fs.writeFileSync(filePath, csvData);
};

const cacheWeatherData = async (
  lat: string,
  lon: string,
  selectedValue: string,
  data: any
): Promise<void> => {
  const currentTime = new Date().toISOString();
  const filePath = getCacheFilePath(selectedValue);
  const cacheData = await readCSV(filePath);
  cacheData.push({
    latitude: lat,
    longitude: lon,
    data: JSON.stringify(data),
    timestamp: currentTime,
  });
  writeCSV(filePath, cacheData);
};

const getCachedWeatherData = async (
  lat: string,
  lon: string,
  selectedValue: string
): Promise<any | null> => {
  const filePath = getCacheFilePath(selectedValue);
  const cacheData = await readCSV(filePath);
  const currentTime = new Date();

  for (const row of cacheData) {
    if (row.latitude === lat && row.longitude === lon) {
      const cachedTime = new Date(row.timestamp);
      const diffInHours =
        (currentTime.getTime() - cachedTime.getTime()) / (1000 * 60 * 60);
      if (diffInHours <= 1) {
        console.log("Cache hit");
        return JSON.parse(row.data);
      } else {
        console.log("Cache expired, removing entry");
        const index = cacheData.indexOf(row);
        if (index !== -1) {
          cacheData.splice(index, 1);
          writeCSV(filePath, cacheData);
        }
      }
    }
  }
  return null;
};

const calculateAverage = (min: number, max: number): number => {
  return (min + max) / 2;
};

const calculateWeatherCode = (codes: number[]): number => {
  // Simplified logic to calculate the average weather code.
  // In a real scenario, you might want a more sophisticated method.
  return 1;
};

const storeDataInDatabase = async (data: any): Promise<void> => {
  try {
    const weatherData = new WeatherDataModel({
      latitude: data.latitude,
      longitude: data.longitude,
      generationtime_ms: data.generationtime_ms,
      utc_offset_seconds: data.utc_offset_seconds,
      timezone: data.timezone,
      timezone_abbreviation: data.timezone_abbreviation,
      elevation: data.elevation,
      current_units: data.current_units,
      current: data.current,
      hourly_units: data.hourly_units,
      hourly: data.hourly,
      daily_units: data.daily_units,
      daily: data.daily,
      createdAt: new Date(),
    });
    await weatherData.save();
  } catch (error) {
    console.error("Error storing data in database:", error);
  }
};

const getWeatherDataFromDatabase = async (
  lat: string,
  lon: string
): Promise<any> => {
  const data = await WeatherDataModel.find({ latitude: lat, longitude: lon });
  return data;
};

router.get("/weather", async (req: Request, res: Response) => {
  const { lat, lon, selectedValue } = req.query;
  if (!lat || !lon || !selectedValue) {
    return res.status(400).send("Missing required query parameters");
  }

  try {
    const data = await getWeatherDataFromDatabase(lat as string, lon as string);
    if (data.length > 0) {
      console.log("Returning data from database");
      return res.json(data[0]);
    }
    // const cachedData = await getCachedWeatherData(
    //   lat as string,
    //   lon as string,
    //   selectedValue as string
    // );
    // if (cachedData) {
    //   console.log("Returning cached data", cachedData);
    //   return res.json(cachedData);
    // }

    let startDate, endDate;
    switch (selectedValue) {
      case "Latest":
        startDate = new Date().toISOString().split("T")[0];
        var latest = new Date();
        latest.setHours(latest.getHours() + 1);
        endDate = latest.toISOString().split("T")[0];

        break;
      case "Tommorow":
        var temp = new Date();
        temp.setDate(temp.getDate() + 1);
        startDate = temp.toISOString().split("T")[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        endDate = tomorrow.toISOString().split("T")[0];
        break;
      case "7days":
        var temp = new Date();
        temp.setDate(temp.getDate() + 7);
        startDate = temp.toISOString().split("T")[0];
        const in7Days = new Date();
        in7Days.setDate(in7Days.getDate() + 7);
        endDate = in7Days.toISOString().split("T")[0];
        break;
      case "15days":
        var temp = new Date();
        temp.setDate(temp.getDate() + 15);
        startDate = temp.toISOString().split("T")[0];
        const in15Days = new Date();
        in15Days.setDate(in15Days.getDate() + 15);
        endDate = in15Days.toISOString().split("T")[0];
        break;
      default:
        return res.status(400).send("Invalid selectedValue");
    }

    let response;
    if (selectedValue === "Latest") {
      response = await axios.get("https://api.open-meteo.com/v1/forecast", {
        params: {
          latitude: lat,
          longitude: lon,
          current: ["temperature_2m", "is_day", "weather_code"],
          hourly: ["temperature_2m", "weather_code"],
          start_date: startDate,
          end_date: endDate,
        },
      });

      // console.log("Latest data", response.data);
      await cacheWeatherData(
        lat as string,
        lon as string,
        selectedValue as string,
        response.data
      );
      await storeDataInDatabase(response.data);

      return res.json({
        current_weather: response.data.current.weather_code,
        current_temperature: response.data.current.temperature_2m,
        hourly: response.data.hourly,
      });
    } else {
      response = await axios.get("https://api.open-meteo.com/v1/forecast", {
        params: {
          latitude: lat,
          longitude: lon,
          daily: "temperature_2m_max,temperature_2m_min",
          current: ["temperature_2m", "weather_code"],
          hourly: ["temperature_2m", "weather_code"],
          start_date: startDate,
          end_date: endDate,
        },
      });
      await cacheWeatherData(
        lat as string,
        lon as string,
        selectedValue as string,
        response.data
      );
      // console.log("Daily data", response.data);
      await storeDataInDatabase(response.data);
      return res.json({
        current_weather: response.data.current.weather_code,
        current_temperature: response.data.current.temperature_2m,
        hourly: response.data.hourly,
        daily: response.data.daily,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching weather data");
  }
});

router.get("/cityDetails", async (req: Request, res: Response) => {
  const { lat, lon, selectedValue } = req.query;
  if (!lat || !lon || !selectedValue) {
    return res.status(400).send("Missing required query parameters");
  }
  let startDate, endDate;
  switch (selectedValue) {
    case "Latest":
      startDate = new Date().toISOString().split("T")[0];
      var latest = new Date();
      latest.setHours(latest.getHours() + 1);
      endDate = latest.toISOString().split("T")[0];

      break;
    case "Tommorow":
      var temp = new Date();
      temp.setDate(temp.getDate() + 1);
      startDate = temp.toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      endDate = tomorrow.toISOString().split("T")[0];
      break;
    case "7days":
      var temp = new Date();
      temp.setDate(temp.getDate() + 0);
      startDate = temp.toISOString().split("T")[0];
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      endDate = in7Days.toISOString().split("T")[0];
      break;
    case "15days":
      var temp = new Date();
      temp.setDate(temp.getDate() + 0);
      startDate = temp.toISOString().split("T")[0];
      const in15Days = new Date();
      in15Days.setDate(in15Days.getDate() + 15);
      endDate = in15Days.toISOString().split("T")[0];
      break;
    default:
      return res.status(400).send("Invalid selectedValue");
  }

  let responses;
  if (selectedValue === "15days" || selectedValue === "7days") {
    const params = {
      latitude: lat,
      longitude: lon,
      start_date: startDate,
      end_date: endDate,
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "wind_speed_10m_max",
        "wind_speed_10m_min",
      ],
      hourly: [
        "temperature_2m",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
      ],
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    responses = await axios(url, { params });
  } else {
    const params = {
      latitude: lat,
      longitude: lon,
      start_date: startDate,
      end_date: endDate,
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
      ],
      current: [
        "temperature_2m",
        "is_day",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
      ],
      hourly: [
        "temperature_2m",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
      ],
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    responses = await axios(url, { params });
  }
  // console.log("City Details", responses.data);
  return res.json({ cityDetails: responses.data });
});

export default router;
