import { useEffect, useMemo, useState } from "react";

function BudgetWidget({ context = {} }) {
  return (
    <div className="guardian-budget-widget">
      <div>
        <small>MONTHLY PLANNING LIMIT</small>
        <strong>
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: context.currency || "NGN",
            maximumFractionDigits: 0,
          }).format(context.budget || 0)}
        </strong>
      </div>
      <div>
        <small>TRACKED RECORDS</small>
        <strong>{context.records || 0}</strong>
      </div>
      <div>
        <small>PAYPAL RECORDS</small>
        <strong>{context.paypalRecords || 0}</strong>
      </div>
      <div>
        <small>GUARDIAN FLAGS</small>
        <strong>{context.flagged || 0}</strong>
      </div>
    </div>
  );
}

function CustomBudgetWidget({ context = {} }) {
  return <BudgetWidget context={context} />;
}

const budgetDefinition = {
  id: "hub-budget-summary",
  label: "PayPal Hub Budget Summary",
  comp: CustomBudgetWidget,
  defaultSize: { width: 700, height: 170 },
  minSize: { width: 320, height: 130 },
};

export default function GuardianBudgetStudio({ context }) {
  const [studioModule, setStudioModule] = useState(null);
  const [studioError, setStudioError] = useState("");

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    let active = true;
    import("ag-studio-react")
      .then((module) => {
        if (active) setStudioModule(module);
      })
      .catch((error) => {
        if (active) setStudioError(error.message || "AG Studio could not load.");
      });

    return () => {
      active = false;
    };
  }, []);

  const widgets = useMemo(() => {
    if (!studioModule) return null;

    return (widgetConfig) =>
      studioModule.createWidgets({
        additionalTypes: [budgetDefinition],
        menu: [
          ...widgetConfig.menu,
          { label: "PayPal Hub", widgetIds: ["hub-budget-summary"] },
        ],
      });
  }, [studioModule]);

  const initialState = useMemo(
    () => ({
      pages: [
        {
          id: "guardian-page",
          widgets: {
            "budget-summary-1": {
              type: "hub-budget-summary",
              dataMapping: {},
            },
          },
          widgetLayout: {
            "budget-summary-1": {
              xTrack: 0,
              yTrack: 0,
              xSpan: 24,
              ySpan: 12,
            },
          },
        },
      ],
      selectedPageId: "guardian-page",
      panels: {
        filters: { collapsed: true },
        data: { collapsed: true },
      },
    }),
    []
  );

  // The evaluation-only AG Studio package is never loaded in production.
  if (!import.meta.env.DEV) {
    return <BudgetWidget context={context} />;
  }

  if (studioError) {
    return (
      <>
        <BudgetWidget context={context} />
        <p className="ledger-method">{studioError}</p>
      </>
    );
  }

  if (!studioModule) {
    return <BudgetWidget context={context} />;
  }

  const { AgStudio, AgStudioProvider } = studioModule;

  return (
    <div className="guardian-studio">
      <AgStudioProvider
        licenseKey={import.meta.env.VITE_AG_STUDIO_LICENSE_KEY}
      >
        <AgStudio
          style={{ height: 190, width: "100%" }}
          data={{ sources: [{ id: "guardian", data: [context] }] }}
          context={context}
          widgets={widgets}
          initialState={initialState}
          mode="edit"
        />
      </AgStudioProvider>
    </div>
  );
}
