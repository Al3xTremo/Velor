import { dashboardSnapshot } from "@velor/core";

export const mobileArchitectureReady = () => {
  return dashboardSnapshot({
    openingBalance: { amount: 0, currency: "EUR" },
    transactions: [],
    goals: [],
  });
};

export const reusableModulesForMobile = () => {
  return {
    domain: ["@velor/core"],
    contracts: ["@velor/contracts"],
    config: ["@velor/config"],
  };
};
