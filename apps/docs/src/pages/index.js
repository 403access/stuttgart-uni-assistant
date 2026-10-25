import React from 'react';
import { Redirect } from '@docusaurus/router';

export default function Home() {
  // docs/README.md is the docs folder index and renders at /docs/.
  return <Redirect to="/docs" />;
}
