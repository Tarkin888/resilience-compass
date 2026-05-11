import { ExternalLink, Info } from "lucide-react";
import { useId } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface LiveTooltipPayload {
  publicationName: string;
  editionLabel: string;
  capturedAtFormatted: string;
  url: string;
}

interface BaseProps {
  variant: "live" | "illustrative" | "mockup";
}

interface LiveProps extends BaseProps {
  variant: "live";
  payload: LiveTooltipPayload;
}

interface OtherProps extends BaseProps {
  variant: "illustrative" | "mockup";
}

export type DataSourceChipProps = LiveProps | OtherProps;

export const DataSourceChip = (props: DataSourceChipProps) => {
  const tooltipId = useId();

  if (props.variant === "live") {
    const { publicationName, editionLabel, capturedAtFormatted, url } = props.payload;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-describedby={tooltipId}
            aria-label={`Open ${publicationName} in a new tab`}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:min-h-0"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Live · Public Data
            <ExternalLink size={12} aria-hidden />
          </a>
        </TooltipTrigger>
        <TooltipContent id={tooltipId} role="tooltip" className="max-w-[280px]">
          <div className="space-y-0.5 text-xs">
            <div>
              <span className="font-semibold">Publication:</span> {publicationName}
            </div>
            <div>
              <span className="font-semibold">Edition:</span> {editionLabel}
            </div>
            <div>
              <span className="font-semibold">Captured:</span> {capturedAtFormatted}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (props.variant === "illustrative") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={0}
            aria-describedby={tooltipId}
            aria-label="Illustrative data"
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Illustrative
          </button>
        </TooltipTrigger>
        <TooltipContent id={tooltipId} role="tooltip" className="max-w-[280px]">
          <span className="text-xs">Demo placeholder — not from a live source</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  // mockup
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="button"
          aria-describedby={tooltipId}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Info size={12} aria-hidden />
          Mockup — not yet live
        </span>
      </TooltipTrigger>
      <TooltipContent id={tooltipId} role="tooltip" className="max-w-[280px]">
        <span className="text-xs">Mockup — not yet live in the demo build</span>
      </TooltipContent>
    </Tooltip>
  );
};
