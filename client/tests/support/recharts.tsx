import { cloneElement, type ReactElement } from 'react';

// jsdom has no layout, so give charts a fixed size instead of measuring the container
export const fixedSizeRecharts = () => {
  const actual = jest.requireActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) => cloneElement(children, { width: 800, height: 300 }),
  };
};
