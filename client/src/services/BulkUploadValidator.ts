import * as XLSX from 'xlsx';
import { type ContentBlockType, type ContentBlock } from '@/types/domain';

export interface ValidationError {
  row: number;
  message: string;
}

export interface ParseResult {
  blocks: Partial<ContentBlock>[];
  errors: ValidationError[];
}

const HEADERS = ['Type', 'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Explanation', 'Hint', 'Tags', 'Note Content'];

export class BulkUploadValidator {
  
  static validateHeaders(actualHeaders: string[]): string | null {
    if (!actualHeaders || actualHeaders.length < HEADERS.length) {
       return "Invalid template: Headers are missing or incomplete.";
    }
    
    // Check first few critical headers to ensure it's the right sheet
    for (let i = 0; i < HEADERS.length; i++) {
        if (String(actualHeaders[i]).trim().toLowerCase() !== HEADERS[i].toLowerCase()) {
            return `Invalid header at column ${i+1}. Expected '${HEADERS[i]}', found '${actualHeaders[i] || ''}'.`;
        }
    }
    return null;
  }

  static parseAndValidate(worksheet: XLSX.WorkSheet, topicId: string): ParseResult {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (jsonData.length === 0) {
        return { blocks: [], errors: [{ row: 0, message: "File is empty." }] };
    }

    const headers = jsonData[0];
    const headerError = this.validateHeaders(headers);
    if (headerError) {
        return { blocks: [], errors: [{ row: 1, message: headerError }] };
    }

    const rows = jsonData.slice(1);
    const blocks: Partial<ContentBlock>[] = [];
    const errors: ValidationError[] = [];

    rows.forEach((row, index) => {
        // Adjust index for 1-based row count (header is row 1, so first data row is 2)
        const rowNum = index + 2; 
        
        // Local error tracking for optimization (averts O(N^2) filter)
        let rowHasError = false;
        const addError = (msg: string) => {
            errors.push({ row: rowNum, message: msg });
            rowHasError = true;
        };

        if (!row[0]) return; // Skip completely empty rows if Type is missing

        const kind = row[0] as ContentBlockType;
        // Validate Kind
        if (!['single_select_mcq', 'multi_select_mcq', 'fill_in_the_blank', 'note'].includes(kind)) {
             addError(`Invalid Type '${kind}'. Must be one of: single_select_mcq, multi_select_mcq, fill_in_the_blank, note.`);
             return; 
        }

        const question = row[1] != null ? String(row[1]).trim() : '';
        const opt1 = row[2];
        const opt2 = row[3];
        const opt3 = row[4];
        const opt4 = row[5];
        const correctRaw = row[6];
        const explanation = row[7] != null ? String(row[7]).trim() : '';
        const hintRaw = row[8] != null ? String(row[8]).split(',').map(t => t.trim()).filter(Boolean) : [];
        const tags = row[9] ? String(row[9]).split(',').map(t => t.trim()).filter(Boolean) : [];
        const content = row[10] != null ? String(row[10]).trim() : '';
        const imageUrl = row[11] != null ? String(row[11]).trim() : '';

        const block: any = { kind, tags, topicId };

        if (hintRaw.length > 0) {
            block.hints = hintRaw;
        }

        if (imageUrl) {
            block.imageUrl = imageUrl;
        }

        if (kind === 'note') {
            const noteContent = content || question;
            if (!noteContent) {
                addError("Note must have content.");
            }
            block.content = noteContent;
        } else if (['single_select_mcq', 'multi_select_mcq'].includes(kind)) {
            if (!question) {
                addError("Question text is required.");
            }

            const options: any[] = [];
            // Helper to add option
            const addOpt = (id: string, val: any) => {
                const text = val != null ? String(val).trim() : '';
                if (text) options.push({ id, text, isCorrect: false });
            };
            addOpt('1', opt1);
            addOpt('2', opt2);
            addOpt('3', opt3);
            addOpt('4', opt4);

            if (options.length < 2) {
                addError("At least 2 options are required for MCQs.");
            }

            // Check for duplicate options
            const uniqueTexts = new Set<string>();
            const duplicates = new Set<string>();
            options.forEach(opt => {
                const normalized = opt.text.trim().toLowerCase();
                if (uniqueTexts.has(normalized)) {
                    duplicates.add(opt.text);
                } else {
                    uniqueTexts.add(normalized);
                }
            });

            if (duplicates.size > 0) {
                 addError(`Duplicate options found: ${Array.from(duplicates).join(', ')}`);
            }

            // Correct Answer Validation
            let hasCorrect = false;
            if (correctRaw != null) {
                // Split by comma for both single and multi select to support "1, 2" format
                // even though single select should ideally be just "1", user might type "1," etc.
                const correctStr = String(correctRaw).trim();
                const correctParts = correctStr ? correctStr.split(',').map(s => s.trim()).filter(s => s !== '') : [];
                
                // Validate that all referenced option IDs actually exist
                const availableIds = options.map(o => o.id);
                const invalidIds = correctParts.filter(id => !availableIds.includes(id));
                if (invalidIds.length > 0) {
                     addError(`Correct answers (${invalidIds.join(', ')}) reference missing options.`);
                }
                
                options.forEach(opt => {
                    // Match strictly by ID (1, 2, 3, 4)
                    if (correctParts.includes(opt.id)) {
                        opt.isCorrect = true;
                        hasCorrect = true;
                    }
                });
            }

            if (!hasCorrect) {
                 addError(`${kind === 'single_select_mcq' ? 'Single' : 'Multi'} select question must have a valid correct answer matched to an option.`);
            } else if (kind === 'single_select_mcq' && options.filter(o => o.isCorrect).length > 1) {
                 addError("Single select question cannot have multiple correct answers.");
            }

            block.question = question;
            block.explanation = explanation;
            block.options = options;
        
        } else if (kind === 'fill_in_the_blank') {
             if (!question) {
                addError("Question text is required.");
             }
             
             const blanks = correctRaw != null ? String(correctRaw).split(',').map(s => s.trim()).filter(Boolean) : [];
             if (blanks.length === 0) {
                 addError("Fill-in-the-blank must have at least one answer in 'Correct Answer' column.");
             }

             // Validation: Mismatch between {{blank}} count and answers
             const blankCount = (question.match(/{{blank}}/g) || []).length;
             if (blankCount === 0) {
                 addError("Fill-in-the-blank question must contain at least one '{{blank}}' placeholder.");
             } else if (blankCount !== blanks.length) {
                 addError(`Mismatch: Question has ${blankCount} {{blank}} placeholders, but ${blanks.length} answers provided.`);
             }
             
             block.question = question;
             block.explanation = explanation;
             block.blankAnswers = blanks;
        }

        if (!rowHasError) {
            blocks.push(block as Partial<ContentBlock>);
        }
    });

    return { blocks, errors };
  }
}
