import React, { ComponentProps, PropsWithChildren } from 'react';

export function makeChakraOverride<Comp extends React.FC>(
  Component: Comp,
  name: string,
  defaultProps: ComponentProps<Comp>,
) {
  const WrappedComponent = (props: ComponentProps<Comp>) => {
    return <Component {...(defaultProps as any)} {...props}></Component>;
  };

  WrappedComponent.displayName = name;

  return WrappedComponent;
}
