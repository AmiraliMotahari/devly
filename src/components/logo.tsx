import Image from "next/image";

import logoImage from "@/app/icon0.svg";

const Logo = () => {
  return (
    <Image
      src={logoImage}
      alt="Devly Logo"
      width={24}
      height={24}
      className="object-center object-cover size-6"
    />
  );
};

export default Logo;
