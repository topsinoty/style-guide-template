export const areaId = (name: string) =>
  `ed-${name.toLowerCase().replaceAll(' ', '-')}`;

export function scrollToArea(name: string) {
  const heading = document.getElementById(areaId(name));
  const body = heading?.closest('.cd-drawer-body');
  const sticky = body?.querySelector('.ed-sticky');

  if (!heading || !body || !sticky) {
    return null;
  }

  body.scrollBy({
    top:
      heading.getBoundingClientRect().top -
      sticky.getBoundingClientRect().bottom -
      12,
  });

  return heading.closest('section');
}
