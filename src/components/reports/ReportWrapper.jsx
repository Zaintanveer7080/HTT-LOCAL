import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ReportWrapper = ({ title, children, filterToolbar }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {filterToolbar && (
          <div className="mb-4">
            {filterToolbar}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
};

export default ReportWrapper;