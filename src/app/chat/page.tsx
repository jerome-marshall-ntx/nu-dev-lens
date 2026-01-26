"use client";

import { ChatInterface } from "@/components/chat";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat-new",
      // api: "/api/chat",
    }),
    // messages: [
    //   {
    //     parts: [
    //       {
    //         type: "text",
    //         text: "Find engineers who worked on React Components",
    //       },
    //     ],
    //     id: "d9GI8vTv4zzYIOu0",
    //     role: "user",
    //   },
    //   {
    //     id: "wDa9R9afUKhLZUc9",
    //     role: "assistant",
    //     parts: [
    //       {
    //         type: "step-start",
    //       },
    //       {
    //         type: "reasoning",
    //         text: 'We need to find engineers (contributors) who worked on React Components. Use searchContributors with a detailed query: "engineers who have contributed to projects involving React components, building reusable UI components, front-end development, JavaScript, React library". Let\'s call function.',
    //         state: "done",
    //       },
    //       {
    //         type: "tool-searchContributors",
    //         toolCallId: "chatcmpl-tool-e1bf6ea3b3bf4258b3fca44e635ee39c",
    //         state: "output-available",
    //         input: {
    //           query:
    //             "engineers who have contributed to projects involving React components, building reusable UI components, front-end development, JavaScript, React library",
    //         },
    //         output: [
    //           {
    //             id: 19,
    //             username: "KartheekNadimpalli",
    //             url: "https://github.com/KartheekNadimpalli",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/111478785?v=4",
    //             summary:
    //               "A **frontend UI engineer** who excels at crafting reusable, accessible **React** components, demonstrated by a fully styled **Skeleton Loader** with **LESS**, i18n support, and thorough **Jest/React Testing Library** coverage. Consistently drives complex state management using **Redux** sagas and async actions, and migrates interfaces to modern **GraphQL** and Nutanix Data‑Protection APIs. Their work emphasizes robust **validation**, comprehensive **error‑handling**, and feature‑flag gating to ensure safe, phased releases. Strong focus on enterprise‑grade **dashboard widgets** for disaster‑recovery workflows showcases domain expertise in **DR** and **data‑protection** UI. They champion documentation, accessibility compliance, and high‑quality test suites across the codebase and continuous improvement of developer experience.",
    //             similarity: 0.6340302694376969,
    //           },
    //           {
    //             id: 23,
    //             username: "md-shahnawaz-nutanix",
    //             url: "https://github.com/md-shahnawaz-nutanix",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/58511738?v=4",
    //             summary:
    //               "A **frontend specialist** who builds polished, accessibility‑first UI components using **React** and the **Prism‑ReactJS** design system. Across multiple projects they consistently apply **design tokens**, refine **color contrast**, and add ARIA‑rich label, help‑text, and keyboard‑navigation support, demonstrating deep **a11y** expertise. Their work also modernizes legacy markup by refactoring to semantic components, enhancing **Redux** state handling, and expanding **visual‑regression** and **Jest/React‑Testing‑Library** test suites. They champion internationalization, documented component usage, and their error‑handling patterns and i18n string management ensure production‑grade resilience, while maintaining UI consistency, especially in complex disaster‑recovery workflows, positioning them as a go‑to engineer for **accessible component libraries** and **design‑system integration**.",
    //             similarity: 0.6152465892481139,
    //           },
    //           {
    //             id: 22,
    //             username: "mateisorin99",
    //             url: "https://github.com/mateisorin99",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/122377271?v=4",
    //             summary:
    //               "A **frontend specialist** who excels at building and evolving **React component libraries**, with a strong emphasis on **accessibility** (ARIA attributes, screen‑reader support, focus management) and clean **API ergonomics** through thoughtful prop design and ref forwarding. They consistently refactor UI logic and apply **CSS/LESS** styling improvements to ensure visual consistency while eliminating warnings and bugs. Their commitment to high‑quality code is evident in expanded **Jest** unit tests and **Playwright** end‑to‑end suites that raise coverage thresholds. They also maintain comprehensive **documentation**, release notes, and examples, making the library developer‑friendly and reliable. This blend of component architecture, accessibility expertise, and robust testing defines their core engineering focus.",
    //             similarity: 0.5975838968578382,
    //           },
    //           {
    //             id: 8,
    //             username: "cristiannantu",
    //             url: "https://github.com/cristiannantu",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/158295976?v=4",
    //             summary:
    //               "A **frontend specialist** who drives modern React UI libraries, converting legacy class components to hook‑based **functional components** with **TypeScript**. They consistently champion **accessibility**, adding focus‑restore logic, ARIA attributes, and full keyboard navigation for modals, menus, tables, and a custom **TreeView**. Their work expands component catalogs—icons, sliders, progress warnings, and configurable modals—while sharpening documentation. They upgrade test suites, swapping Enzyme for **React Testing Library**, introducing **Playwright** end‑to‑end flows, and enforcing strict **Jest** coverage. This pattern shows deep expertise in **component architecture**, **UI accessibility**, and **robust testing practices** across large‑scale frontend codebases. They mentor teams on practices for UI design and optimization.",
    //             similarity: 0.5966858435733616,
    //           },
    //           {
    //             id: 27,
    //             username: "nikomandic",
    //             url: "https://github.com/nikomandic",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/145780960?v=4",
    //             summary:
    //               "An **frontend specialist** who builds robust, accessible **React** component libraries. Their work emphasizes **customizable UI building blocks** such as password inputs and date pickers, with meticulous handling of **ARIA attributes**, live‑region roles, and focus management to meet high accessibility standards. They champion **quality assurance** through extensive **Jest**, **Enzyme**, and **Playwright** test suites, including console‑error guards and visual‑regression checks. Documentation and example updates ensure API clarity, while flexible styling options (width, placement, word‑break) showcase a strong grasp of component design patterns. This combination of **UI architecture**, **accessibility engineering**, and **testing rigor** defines their core expertise and maintainable codebases across enterprise projects.",
    //             similarity: 0.5931946387928866,
    //           },
    //           {
    //             id: 7,
    //             username: "barinovos",
    //             url: "https://github.com/barinovos",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/5656193?v=4",
    //             summary:
    //               "A **frontend UI engineer** who excels at building and refining **React** components with strong **TypeScript** typing, the contributor consistently drives **accessibility (ARIA)**, **internationalization**, and **responsive design** across a design‑system ecosystem. Their work repeatedly adds configurable empty‑state messaging, dark‑mode theming, and feature‑flag driven UI flows while integrating **Redux** state validation and robust **error handling**. They champion comprehensive test coverage using **Jest** and UI testing frameworks, and automate quality with CI/CD pipelines. A recurring focus on security‑monitoring dashboards showcases deep domain knowledge in **security widgets**, data visualizations, and alert mechanisms, making them a go‑to expert for secure, accessible enterprise front‑ends.",
    //             similarity: 0.5873971794076694,
    //           },
    //           {
    //             id: 52,
    //             username: "yeeaaagz",
    //             url: "https://github.com/yeeaaagz",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/53870595?v=4",
    //             summary:
    //               "A **frontend specialist** focused on building highly accessible, high‑performance React component libraries. They consistently apply **ARIA**, focus‑management, and live‑region techniques to Popover, Modal, Dropdown, Table and form elements, delivering **accessibility‑first UI** experiences. Their work re‑architects complex components such as an expandable, column‑resizable **Table** and a feature‑rich **Portal/Popover** system with animated transitions and robust click‑away handling. They champion **TypeScript**‑strong APIs, migrate code to functional hooks, and enforce rigorous quality through **Jest**, **Playwright** visual‑regression suites and strict **CI/CD** coverage gates. This blend of UI engineering, accessibility expertise, and test‑driven delivery defines their core strength and promotes maintainable, scalable design patterns across the library.",
    //             similarity: 0.5862690631667082,
    //           },
    //           {
    //             id: 13,
    //             username: "ionut-rusu",
    //             url: "https://github.com/ionut-rusu",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/81302858?v=4",
    //             summary:
    //               "A **full‑stack frontend specialist** who drives large‑scale React component libraries with TypeScript. Their work repeatedly extends UI APIs, adds layout variants, and refines CSS/LESS to meet a strict design system while championing **accessibility** through keyboard navigation and ARIA propagation. They build sophisticated **security‑focused dashboards** and **disaster‑recovery panels**, integrating **data visualizations**, dark‑mode theming, and i18n. Strong state‑management patterns using **Redux** and feature‑flag logic ensure safe user interactions, and they enforce robust quality via **Jest** unit suites and **Playwright** end‑to‑end tests. Release hygiene and CI/CD alignment round out a profile centered on **across multiple** secure **and resilient** maintainable modern enterprise UI delivery.",
    //             similarity: 0.5847984231708108,
    //           },
    //           {
    //             id: 101,
    //             username: "maniraja",
    //             url: "",
    //             avatarUrl: "",
    //             summary:
    //               "A **frontend specialist** who builds sophisticated security‑focused dashboards using **React** and **TypeScript**, delivering responsive, theme‑aware widgets such as Network Security and Credential Manager. They excel at wiring data‑fetch hooks, refactoring API interactions, and managing **i18n** to keep terminology consistent across light and dark modes. Their deep familiarity with a shared **UI component library** enables precise styling, navigation, and state‑management simplification. Strong testing discipline is evident through extensive **Jest** unit and integration suites that support reliable CI/CD pipelines. This combination of UI architecture, theming, and security domain insight makes them a go‑to engineer for complex enterprise front‑ends.",
    //             similarity: 0.5845495617954237,
    //           },
    //           {
    //             id: 26,
    //             username: "nataliepina",
    //             url: "https://github.com/nataliepina",
    //             avatarUrl:
    //               "https://avatars.githubusercontent.com/u/34781875?v=4",
    //             summary:
    //               "A **frontend specialist** who advances component libraries by turning legacy class‑based **React** code into clean, hook‑driven functional components. They champion **accessibility**, systematically adding ARIA roles, keyboard navigation, focus‑visible styling, and screen‑reader announcements across complex UI elements such as tables, sliders, and modals. Their work also expands component APIs with flexible icon placement and custom wrapper slots, while maintaining a rigorous **testing** regimen that includes **Playwright** end‑to‑end, visual regression, and **React Testing Library** unit tests, raising coverage thresholds. Additionally, they streamline **CI/CD** pipelines, enrich documentation, and refine styleguides to ensure consistent, developer‑friendly releases and promote sustainable, high‑quality UI engineering practices globally.",
    //             similarity: 0.5808214043924022,
    //           },
    //         ],
    //       },
    //       {
    //         type: "step-start",
    //       },
    //       {
    //         type: "reasoning",
    //         text: 'We need to respond with list of engineers (contributors) who worked on React components. Probably include those with high similarity, maybe top few. Use required format: <contributor id="id">name</contributor>. Provide brief description. Let\'s select top 5: ids 19,23,22,8,27. Provide output.',
    //         state: "done",
    //       },
    //       {
    //         type: "text",
    //         text: 'Here are several engineers whose work prominently features building, maintaining, and evolving **React components** (especially reusable UI libraries, accessibility‑first widgets, and front‑end architecture):\n\n| # | Contributor |\n|---|-------------|\n| 1 | <contributor id="19">Kartheek Nadimpalli</contributor> – Front‑end UI engineer known for crafting reusable, accessible React components (e.g., a fully styled Skeleton Loader) with strong Redux‑Saga state management, GraphQL migration, and comprehensive Jest/React‑Testing‑Library coverage. |\n| 2 | <contributor id="23">md‑shahnawaz‑nutanix</contributor> – Front‑end specialist focused on accessibility‑first UI components using the Prism‑ReactJS design system, extensive ARIA support, and robust testing suites. |\n| 3 | <contributor id="22">mateisorin99</contributor> – Expert in React component libraries, emphasizing ARIA accessibility, clean API ergonomics, and thorough Jest + Playwright testing. |\n| 4 | <contributor id="8">cristiannantu</contributor> – Drives modern React UI libraries, converting class components to hook‑based TypeScript functional components, with deep focus on accessibility (focus‑restore, keyboard navigation) and testing migration to React Testing Library. |\n| 5 | <contributor id="27">nikomandic</contributor> – Builds robust, accessible React component libraries (e.g., password inputs, date pickers) with meticulous ARIA handling, extensive Jest/Enzyme/Playwright coverage, and well‑documented APIs. |\n\nThese contributors consistently demonstrate expertise in:\n\n* Designing reusable, theme‑aware React components.\n* Ensuring high accessibility standards (ARIA, keyboard navigation, screen‑reader support).\n* Maintaining strong test coverage (unit, integration, visual regression) using Jest, React Testing Library, Playwright, etc.\n* Leveraging TypeScript for type‑safe component APIs.\n* Contributing to enterprise‑grade design‑system ecosystems.',
    //         state: "done",
    //       },
    //     ],
    //   },
    // ],
  });
  console.log("🚀 ~ Chat ~ messages:", messages);

  return (
    <ChatInterface
      messages={messages}
      status={status}
      onSendMessage={(text) => sendMessage({ text })}
    />
  );
}
