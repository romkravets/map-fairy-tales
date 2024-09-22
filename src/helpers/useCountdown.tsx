"use client";

import {get, update, ref as dbRef} from 'firebase/database';
import React, { useState, useEffect, useContext } from "react";
import { UserAuthBuilder } from '../../context/context';
import { db } from '@/db/firebase';

const useCountdown = (expiryTime: number, updatedUserStories?: Array<{ id?: string }>, getUserData?: () => void) => {
  const { user } = useContext(UserAuthBuilder);

  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    if (!expiryTime || !user?.userId) return;

    const downDate = new Date(expiryTime).getTime();

    const updateTime = setInterval(async () => {
      const now = new Date().getTime();

      const difference = downDate - now;

      console.log(updatedUserStories, 'updatedUserStories')

      if (difference <= 0) {
        clearInterval(updateTime);
        const newCountStoryOfDay = 3;

        try {
          await update(dbRef(db, `users/${user.userId}`), {
            expiryTime: null,
            countStoryOfDay: newCountStoryOfDay,
        }).then(() => {
            getUserData?.();
          });
        } catch (err) {
          console.log(err)
        }
        console.log('Stories updated with countStoryOfDay = 3 and new expiryTime.');

        setHours(0);
        setMinutes(0);
        setSeconds(0);

        clearInterval(updateTime);
        return;
      }

      const newHours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const newMinutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const newSeconds = Math.floor((difference % (1000 * 60)) / 1000);

      setHours(newHours);
      setMinutes(newMinutes);
      setSeconds(newSeconds);
    }, 1000);

    return () => clearInterval(updateTime);
  }, [expiryTime, getUserData, updatedUserStories, user.userId]);

  return { hours, minutes, seconds };
};

export { useCountdown };
