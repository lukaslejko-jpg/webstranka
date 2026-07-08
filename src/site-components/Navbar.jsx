"use client";
import React from "react";
import { DEVLINK_SCOPE_CLASS } from "./devlinkScope";
import Block from "./webflow_modules/Basic/components/Block";
import Icon from "./webflow_modules/Icon/components/Icon";
import Image from "./webflow_modules/Basic/components/Image";
import Link from "./webflow_modules/Basic/components/Link";
import List from "./webflow_modules/Basic/components/List";
import ListItem from "./webflow_modules/Basic/components/ListItem";
import NavbarBrand from "./webflow_modules/Navbar/components/NavbarBrand";
import NavbarButton from "./webflow_modules/Navbar/components/NavbarButton";
import NavbarMenu from "./webflow_modules/Navbar/components/NavbarMenu";
import NavbarWrapper from "./webflow_modules/Navbar/components/NavbarWrapper";
import Section from "./webflow_modules/Layout/components/Section";

export function Navbar({}) {
  return (
    <div
      className={DEVLINK_SCOPE_CLASS}
      style={{
        display: "contents",
      }}
    >
      <Section
        className={"navbar-logo-left"}
        grid={{
          type: "section",
        }}
        tag={"div"}
      >
        <NavbarWrapper
          className={"navbar-logo-left-container"}
          config={{
            easing: "ease",
            easing2: "ease",
            duration: 400,
            docHeight: false,
            noScroll: false,
            animation: "default",
            collapse: "medium",
          }}
          tag={"div"}
        >
          <Block className={"container"} tag={"div"}>
            <Block className={"navbar-wrapper"} tag={"div"}>
              <NavbarBrand
                className={"navbar-brand"}
                options={{
                  href: "#",
                }}
              >
                <Image
                  alt={""}
                  height={"auto"}
                  loading={"lazy"}
                  src={
                    "https://cdn.prod.website-files.com/69df8417564a7dee64a7868a/69df8418564a7dee64a786eb_wp-logo.svg"
                  }
                  width={"auto"}
                />
              </NavbarBrand>
              <NavbarMenu
                className={"nav-menu-wrapper"}
                role={"navigation"}
                tag={"nav"}
              >
                <List className={"nav-menu-two"} tag={"ul"} unstyled={true}>
                  <ListItem>
                    <Link
                      block={""}
                      button={false}
                      className={"nav-link"}
                      options={{
                        href: "/",
                      }}
                    >
                      {"Back to Home"}
                    </Link>
                  </ListItem>
                </List>
              </NavbarMenu>
              <NavbarButton className={"menu-button"} tag={"div"}>
                <Icon
                  widget={{
                    type: "icon",
                    icon: "nav-menu",
                  }}
                />
              </NavbarButton>
            </Block>
          </Block>
        </NavbarWrapper>
      </Section>
    </div>
  );
}
