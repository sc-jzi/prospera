'use client';

import { AppPlaceholder, ComponentMap, ImageField, useSitecore } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';
import { JSX, useState } from 'react';
import PreviewSearch from "../search/PreviewSearch"
import { PREVIEW_WIDGET_ID } from "../../_data/customizations";

export type EyebrowProps = ComponentProps & {
  fields: {
    LogoImage: ImageField;
  };
  componentMap: ComponentMap;
};

export const Default = (props: EyebrowProps): JSX.Element => {
  const id = props.params.RenderingIdentifier;
  const { page } = useSitecore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className={`component eyebrow	${props.params.styles?.trimEnd()}`} id={id ? id : undefined}>
      <div className={`container container-${props.params?.ContainerWidth?.toLowerCase()}-fluid`}>
        <div className="row">
          <div className="col col-placeholder">
            <AppPlaceholder name="eyebrow-left" rendering={props.rendering} page={page} componentMap={props.componentMap} />
            <AppPlaceholder name="eyebrow-right" rendering={props.rendering} page={page} componentMap={props.componentMap} />
          </div>
          <div className="flex items-center gap-2">
              <PreviewSearch rfkId={PREVIEW_WIDGET_ID} isOpen={isSearchOpen} setIsSearchOpen={setIsSearchOpen} />

              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};
