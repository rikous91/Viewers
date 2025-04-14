const getToggledClassName = isToggled => {
  return isToggled
    ? '!text-primary tool-activated'
    : '!text-common-bright hover:!bg-primary-dark hover:text-primary-light';
};

export { getToggledClassName };
