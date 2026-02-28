"use client";

import { update, ref as dbRef } from "firebase/database";
import { useState, useEffect, useContext, useRef } from "react";
import { UserAuthBuilder } from "../../context/context";
import { db } from "@/db/firebase";

const useCountdown = (
  expiryTime: number,
  // ← видалено updatedUserStories з параметрів — він не потрібен всередині hook
  getUserData?: () => void,
) => {
  const { user } = useContext(UserAuthBuilder);

  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  // ← Зберігаємо останню версію getUserData в ref,
  //   щоб не додавати її в deps useEffect і не перезапускати інтервал
  const getUserDataRef = useRef(getUserData);
  useEffect(() => {
    getUserDataRef.current = getUserData;
  }, [getUserData]);

  useEffect(() => {
    // Якщо немає expiryTime або userId — нічого не робимо
    if (!expiryTime || !user?.userId) return;

    const downDate = new Date(expiryTime).getTime();

    const updateTime = setInterval(async () => {
      const now = Date.now();
      const difference = downDate - now;

      if (difference <= 0) {
        clearInterval(updateTime);
        setHours(0);
        setMinutes(0);
        setSeconds(0);

        try {
          await update(dbRef(db, `users/${user.userId}`), {
            expiryTime: null,
            countStoryOfDay: 3,
          });
          // Викликаємо через ref — не впливає на deps
          getUserDataRef.current?.();
        } catch (err) {
          console.error("Countdown update error:", err);
        }
        return;
      }

      setHours(
        Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      );
      setMinutes(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)));
      setSeconds(Math.floor((difference % (1000 * 60)) / 1000));
    }, 1000);

    return () => clearInterval(updateTime);

    // ← Тільки стабільні залежності: expiryTime і userId
    //   Інтервал перезапускається лише коли реально змінився таймер або юзер
  }, [expiryTime, user?.userId]);

  return { hours, minutes, seconds };
};

export { useCountdown };
