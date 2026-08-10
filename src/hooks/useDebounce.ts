// src/hooks/useDebounce.ts
// ══════════════════════════════════════════════════════════════════════════════
// useDebounce — Trì hoãn cập nhật giá trị sau một khoảng thời gian
//
// Không dùng lodash.debounce (nặng hơn, không cần thiết cho 1 hook đơn giản).
// Dùng useRef + setTimeout → không tạo closure leak.
//
// Cách dùng:
//   const debouncedSearch = useDebounce(rawSearch, 400);
//   // debouncedSearch chỉ thay đổi khi rawSearch không thay đổi trong 400ms
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

/**
 * @param value   Giá trị cần debounce
 * @param delay   Độ trễ tính bằng milliseconds (mặc định 400ms)
 * @returns       Giá trị đã được debounce
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timer: sau `delay` ms mới cập nhật debouncedValue
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: nếu `value` thay đổi trước khi timer kết thúc
    // → hủy timer cũ (không gọi setDebouncedValue)
    // → useEffect chạy lại với timer mới
    // → Đây chính là cơ chế debounce: chỉ commit giá trị sau khi
    //   người dùng dừng gõ đủ `delay` ms
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
