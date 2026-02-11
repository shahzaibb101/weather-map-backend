import mongoose, { Schema, Document } from 'mongoose';

interface IWeatherData extends Document {
    latitude: number;
    longitude: number;
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    current_units: {
        time: string;
        interval: string;
        temperature_2m: string;
        weather_code: string;
    };
    current: {
        time: string;
        interval: number;
        temperature_2m: number;
        weather_code: number;
    };
    hourly_units: {
        time: string;
        temperature_2m: string;
        weather_code: string;
    };
    hourly: {
        time: string[];
        temperature_2m: number[];
        weather_code: number[];
    };
    daily_units: {
        time: string;
        temperature_2m_max: string;
        temperature_2m_min: string;
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
    };
    createdAt: Date;
}

const WeatherDataSchema: Schema = new Schema({
    latitude: { type: Number, required: false},
    longitude: { type: Number, required: false},
    generationtime_ms: { type: Number, required: false},
    utc_offset_seconds: { type: Number, required: false},
    timezone: { type: String, required: false},
    timezone_abbreviation: { type: String, required: false},
    elevation: { type: Number, required: false},
    current_units: {
        time: { type: String, required: false},
        interval: { type: String, required: false},
        temperature_2m: { type: String, required: false},
        weather_code: { type: String, required: false},
    },
    current: {
        time: { type: String, required: false},
        interval: { type: Number, required: false},
        temperature_2m: { type: Number, required: false},
        weather_code: { type: Number, required: false},
    },
    hourly_units: {
        time: { type: String, required: false},
        temperature_2m: { type: String, required: false},
        weather_code: { type: String, required: false},
    },
    hourly: {
        time: { type: [String], required: false},
        temperature_2m: { type: [Number], required: false},
        weather_code: { type: [Number], required: false},
    },
    daily_units: {
        time: { type: String, required: false},
        temperature_2m_max: { type: String, required: false},
        temperature_2m_min: { type: String, required: false},
    },
    daily: {
        time: { type: [String], required: false},
        temperature_2m_max: { type: [Number], required: false},
        temperature_2m_min: { type: [Number], required: false},
    },
    createdAt: { type: Date, default: Date.now },
});

const WeatherDataModel = mongoose.model<IWeatherData>('WeatherData', WeatherDataSchema);

export default WeatherDataModel;