import React from "react";
import { Grid } from "../../components/TableOfContents/Grid";
import { TOCItem } from "../../components/TableOfContents/TOCItem";

export const TableOfContents: React.FC = () => {
  return (
    <div>
      <Grid>
        <TOCItem link="/docs/sfx/whip">
          <strong>whip</strong>
          <div>URL for a whip sound effect</div>
        </TOCItem>
        <TOCItem link="/docs/sfx/whoosh">
          <strong>whoosh</strong>
          <div>URL for a whoosh sound effect</div>
        </TOCItem>
      </Grid>
    </div>
  );
};
