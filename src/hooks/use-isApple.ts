import { useEffect, useState } from "react";

export function useIsApple() {
  const [isApple, setIsApple] = useState(true);

  const detect = () => {
    const value = navigator.platform.toLocaleLowerCase();
    
    const result =
      value.includes("mac") ||
      value.includes("iphone") ||
      value.includes("ipod") ||
      value.includes("ipad");

    setIsApple(result);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    detect();
  }, []);

  return isApple;
}
