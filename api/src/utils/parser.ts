// ============================================
// 文件: api/src/utils/parser.ts
// ============================================

import type { TrainWithPrice, TicketPrice } from '../types.js';

/**
 * 标准化座位显示值
 * - "有" → "有"
 * - 数字 → 保留
 * - "--"/""/"无" → "--"
 * - "*" → "*"
 */
function normalizeSeat(value: string | undefined): string {
  if (value === undefined || value === null) return '--';
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '--' || trimmed === '无') return '--';
  if (trimmed === '*') return '*';
  if (trimmed === '有') return '有';
  // 纯数字保留
  if (/^\d+$/.test(trimmed)) return trimmed;
  return '--';
}

/**
 * 解析 12306 管道分隔的列车查询结果
 * 字段索引严格对应规格文档
 */
export function parseTrainResult(result: string): TrainWithPrice {
  const fields = result.split('|');

  // 防御性检查：确保字段数量足够
  if (fields.length < 36) {
    throw new Error(`Invalid train result format: expected 36+ fields, got ${fields.length}`);
  }

  const train: TrainWithPrice = {
    // 基础 Train 字段
    trainNo: fields[2] ?? '',
    trainCode: fields[3] ?? '',
    fromStation: '',      // 将在后续通过 stationMap 解析填充
    toStation: '',        // 将在后续通过 stationMap 解析填充
    departTime: fields[8] ?? '',
    arriveTime: fields[9] ?? '',
    duration: fields[10] ?? '',
    secondClassSeats: normalizeSeat(fields[30]),
    firstClassSeats: normalizeSeat(fields[31]),
    businessSeats: normalizeSeat(fields[32]),
    noSeatTickets: normalizeSeat(fields[26]),
    // 后端扩展字段
    fromStationCode: fields[6] ?? '',
    toStationCode: fields[7] ?? '',
    fromStationNo: fields[16] ?? '',
    toStationNo: fields[17] ?? '',
    seatTypeCodes: fields[35] ?? '',
  };

  return train;
}

/**
 * 解析 12306 station_name.js 内容
 * 格式: @abbrev|name|code|pinyin|initial|index
 * 返回 Map<code, name>
 */
export function parseStationMap(jsContent: string): Map<string, string> {
  const map = new Map<string, string>();

  // 12306 的 station_name.js 格式为: var station_names ='@bjb|北京北|VAP|beijingbei|bjb|0@bjd|北京东|BOP|...';
  // 提取引号内的内容
  const match = jsContent.match(/['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error('Cannot find station data in JS content');
  }

  const dataStr = match[1];
  const stations = dataStr.split('@');

  for (const station of stations) {
    if (!station.trim()) continue;
    const parts = station.split('|');
    if (parts.length >= 3) {
      const name = parts[1];
      const code = parts[2];
      if (name && code) {
        map.set(code, name);
      }
    }
  }

  return map;
}

/**
 * 解析票价查询结果
 * 价格码映射: A9=business, M=firstClass, O=secondClass, WZ=noSeat
 */
export function parseTicketPrice(data: Record<string, string>): TicketPrice {
  return {
    business: data.A9,
    firstClass: data.M,
    secondClass: data.O,
    noSeat: data.WZ,
  };
}