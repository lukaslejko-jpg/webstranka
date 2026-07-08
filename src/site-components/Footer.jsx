"use client";
import React from "react";
import { DEVLINK_SCOPE_CLASS } from "./devlinkScope";
import Block from "./webflow_modules/Basic/components/Block";
import BlockContainer from "./webflow_modules/Layout/components/BlockContainer";
import Link from "./webflow_modules/Basic/components/Link";
import Section from "./webflow_modules/Layout/components/Section";

export function Footer({}) {
  return (
    <div
      className={DEVLINK_SCOPE_CLASS}
      style={{
        display: "contents",
      }}
    >
      <Section
        className={"footer"}
        grid={{
          type: "section",
        }}
        tag={"section"}
      >
        <BlockContainer
          className={"container"}
          grid={{
            type: "container",
          }}
          tag={"div"}
        >
          <Block className={"footer-grid-bottom"} tag={"div"}>
            <Block className={"dark-footer-links-wrapper"} tag={"div"}>
              <Link
                block={""}
                button={false}
                className={"footer-link"}
                options={{
                  href: "https://webflow.com/?r=0",
                  target: "_blank",
                }}
              >
                {"Privacy Policy"}
              </Link>
              <Link
                block={""}
                button={false}
                className={"footer-link"}
                options={{
                  href: "https://webflow.com/?r=0",
                  target: "_blank",
                }}
              >
                {"Cookie Policy"}
              </Link>
            </Block>
            <Block className={"dark-footer-links-wrapper"} tag={"div"}>
              <Link
                block={""}
                button={false}
                className={"footer-link"}
                options={{
                  href: "https://www.zoyaqib.com/",
                  target: "_blank",
                }}
              >
                {"Created by Zoya Aqib"}
              </Link>
              <Link
                block={""}
                button={false}
                className={"footer-link"}
                options={{
                  href: "https://webflow.com/?r=0",
                  target: "_blank",
                }}
              >
                {"Powered by Webflow"}
              </Link>
            </Block>
          </Block>
        </BlockContainer>
      </Section>
    </div>
  );
}
