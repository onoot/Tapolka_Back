import React, { useEffect, useState } from 'react';
import cl from "../Settings/Settings.module.css";
import clD from "./Boost.module.css";
import ButtonClose from "../ButtonSettingBack/ButtonClose";
import { changeNavbarAndMine } from "../../hooks/changeNavbarAndMine";
import { convertMoneyToReduction } from "../../hooks/converMoney";
import Money from "../Money/Money";
import { usePlayerStore, updatePlayer } from '../../../store/playerStore.mjs';
import { toast } from 'react-toastify';
import { use } from 'react';

const Boost = ({ boost, energy, visible, setVisible, money }) => {
  const player = usePlayerStore((state) => state.player);
  const url = 'https://tongaroo.fun';

  const [boosters, setBoosters] = useState([
    {
      id: 1, name: "Multitap", benefit: 1000, level: 1, basePrice: 1000, img: "multitap"
    },
    {
      id: 2, name: "Energy limit", benefit: 1000, level: 1, basePrice: 1000, img: "lightning"
    }
  ]);

  const calculatePrice = (basePrice, level) => basePrice * (1 + level * 0.5);

  const booster = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token not found');
        toast.error('Token not found', { theme: 'dark' });
        return;
      }

      let booster = id === 0 ? { name: 'full', basePrice: 0, level: 0 } : boosters.find((item) => item.id === id);
      if (!booster) {
        console.error('Booster not found');
        toast.error('Booster not found', { theme: 'dark' });
        return;
      }

      let nextPrice = calculatePrice(booster.basePrice, booster.level);

      if (money < nextPrice) {
        toast.error('Not enough money', { theme: 'dark' });
        return;
      }

      // Отправка данных на сервер
      const req = await fetch(url + '/api/boost/' + player?.id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ boost: booster.name })
      });
      if (!req.ok) {
        toast.error(`Error code ${req.status}`, { theme: 'dark' });
        return;
      }

      // Успешное обновление
      toast.success('Boosted', { theme: 'dark' });

      if (id === 0) {
        updatePlayer({ boost: { fullEnergi: { count: -1 } }, energy: req?.body?.energy });
      } else {
        setBoosters((prev) =>
          prev.map((b) => (b.id === id ? { ...b, level: b.level + 1 } : b))
        );
        // обновить монеты и уровень для конкретного бустера
        updatePlayer({ money: money - nextPrice });
      }

      changeNavbarAndMine();
      setVisible(false);
    } catch (e) {
      console.error(e);
      toast.error(e.message, { theme: 'dark' });
    }
  };

  const rootClasses = [cl.settings__container];
  if (visible === true) {
    rootClasses.push(cl.active);
  }

  return (
    <div>
      <div className={rootClasses.join(" ")}>
        <div className={cl.settings__container__titlePanel}>
          <ButtonClose setVisible={setVisible} />
          <div className={cl.settings__container__title}>
            Boost
          </div>
        </div>
        <div className={clD.boosters__balance}>
          <div className={clD.boosters__balance__title}>
            Your balance
          </div>
          <div>
            <Money money={money} />
          </div>
        </div>
        <div className={cl.settings__container__settingBlock}>
          Free daily boosters
          <div className={clD.boosters__container}>
            <div className={clD.boosters__container__block}>
              <div className={clD.boosters__container__block_img}>
                <img src={require(`../../images/lightning.webp`)} alt="" />
              </div>
            </div>
            <div onClick={() => booster(0)} className={clD.boosters__container__block}>
              <div className={clD.boosters__container__block__title}>
                Full energy
              </div>
              <div className={clD.boosters__container__block__info}>
                <div className={clD.boosters__container__block__level}>
                  {player?.boost?.fullEnergi?.count || 0}/3 available
                </div>
              </div>
            </div>
          </div>
          Boosters

          {boosters.map((prop) => {
            return (
              <div key={prop.id} onClick={() => booster(prop.id)} className={clD.boosters__container}>
                <div className={clD.boosters__container__block}>
                  <div className={clD.boosters__container__block_img}>
                    <img src={require(`../../images/${prop.img}.webp`)} alt="" />
                  </div>
                </div>
                <div className={clD.boosters__container__block}>
                  <div className={clD.boosters__container__block__title}>
                    {prop.name}
                  </div>
                  <div className={clD.boosters__container__block__info}>
                    <div className={clD.boosters__container__block__level}>
                      Level: {prop.level}
                    </div>
                    <div className={clD.boosters__container__block__price}>
                      {convertMoneyToReduction(calculatePrice(prop.basePrice, prop.level))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Boost;
