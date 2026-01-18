import { BsDeviceSsdFill, BsFillMotherboardFill, BsGpuCard, BsKeyboardFill, BsHeadset, BsFillMouse2Fill } from "react-icons/bs";
import { FaMemory, FaFan } from "react-icons/fa";
import { HiMiniCpuChip } from "react-icons/hi2";
import { PiCarBatteryFill, PiComputerTowerFill } from "react-icons/pi";
import { GrFanOption } from "react-icons/gr";
import { RiComputerFill } from "react-icons/ri";
import { IoGameController } from "react-icons/io5";
import type { CategoryKey } from './categories';

export const CategoryIcons: Record<CategoryKey, React.ComponentType<{ className?: string }>> = {
  cpu: HiMiniCpuChip,
  motherboard: BsFillMotherboardFill,
  ram: FaMemory,
  gpu: BsGpuCard,
  storage: BsDeviceSsdFill,
  psu: PiCarBatteryFill,
  case: PiComputerTowerFill,
  cooler: GrFanOption,
  monitor: RiComputerFill,
  mouse: BsFillMouse2Fill,
  headphones: BsHeadset,
  keyboard: BsKeyboardFill,
  fans: FaFan,
  peripherals: IoGameController,
};

export function getCategoryIcon(categoryKey: CategoryKey): React.ComponentType<{ className?: string }> {
  return CategoryIcons[categoryKey];
}

